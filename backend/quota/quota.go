package quota

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"
)

const (
	tokenEndpoint		= "https://oauth2.googleapis.com/token"
	loadCodeAssistURL	= "https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist"
	retrieveQuotaURL	= "https://cloudcode-pa.googleapis.com/v1internal:retrieveUserQuota"
)

var (
	oauthOnce	sync.Once
	oauthClientID	string
	oauthSecret	string

	clientIDRe	= regexp.MustCompile(`OAUTH_CLIENT_ID\s*=\s*"([^"]+)"`)
	secretRe	= regexp.MustCompile(`OAUTH_CLIENT_SECRET\s*=\s*"([^"]+)"`)
)

func loadOAuthClient() (string, string) {
	oauthOnce.Do(func() {
		dir := geminiBundleDir()
		if dir == "" {
			return
		}
		entries, err := os.ReadDir(dir)
		if err != nil {
			return
		}
		for _, e := range entries {
			if e.IsDir() || !strings.HasSuffix(e.Name(), ".js") {
				continue
			}
			data, err := os.ReadFile(filepath.Join(dir, e.Name()))
			if err != nil {
				continue
			}
			if oauthClientID == "" {
				if m := clientIDRe.FindSubmatch(data); m != nil {
					oauthClientID = string(m[1])
				}
			}
			if oauthSecret == "" {
				if m := secretRe.FindSubmatch(data); m != nil {
					oauthSecret = string(m[1])
				}
			}
			if oauthClientID != "" && oauthSecret != "" {
				break
			}
		}
	})
	return oauthClientID, oauthSecret
}

func geminiBundleDir() string {
	p, err := exec.LookPath("gemini")
	if err != nil {
		return ""
	}
	if rp, err := filepath.EvalSymlinks(p); err == nil {
		p = rp
	}

	marker := filepath.Join("@google", "gemini-cli")
	if idx := strings.Index(p, marker); idx >= 0 {
		pkg := p[:idx+len(marker)]
		if b := filepath.Join(pkg, "bundle"); isDir(b) {
			return b
		}
		return pkg
	}

	if out, err := exec.Command("npm", "root", "-g").Output(); err == nil {
		b := filepath.Join(strings.TrimSpace(string(out)), "@google", "gemini-cli", "bundle")
		if isDir(b) {
			return b
		}
	}
	return ""
}

func isDir(p string) bool {
	info, err := os.Stat(p)
	return err == nil && info.IsDir()
}

type oauthCreds struct {
	AccessToken	string	`json:"access_token"`
	RefreshToken	string	`json:"refresh_token"`
	ExpiryDate	int64	`json:"expiry_date"`
}

type QuotaBucket struct {
	ModelID			string		`json:"model_id"`
	RemainingFraction	float64		`json:"remaining_fraction"`
	ResetTime		time.Time	`json:"reset_time"`
	TokenType		string		`json:"token_type"`
}

type QuotaResult struct {
	Available	bool		`json:"available"`
	UsedPct		float64		`json:"used_pct"`
	ResetTime	time.Time	`json:"reset_time"`
	Buckets		[]QuotaBucket	`json:"buckets"`
}

var (
	mu		sync.Mutex
	cachedToken	string
	tokenExpiry	time.Time
	projectID	string
)

func credsFile() string {
	home, _ := os.UserHomeDir()
	return filepath.Join(home, ".gemini", "oauth_creds.json")
}

func readCreds() (*oauthCreds, error) {
	data, err := os.ReadFile(credsFile())
	if err != nil {
		return nil, err
	}
	var c oauthCreds
	if err := json.Unmarshal(data, &c); err != nil {
		return nil, err
	}
	return &c, nil
}

func writeCreds(c *oauthCreds) {
	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return
	}
	_ = os.WriteFile(credsFile(), data, 0600)
}

func accessToken() (string, error) {
	mu.Lock()
	defer mu.Unlock()

	if cachedToken != "" && time.Now().Before(tokenExpiry.Add(-30*time.Second)) {
		return cachedToken, nil
	}

	creds, err := readCreds()
	if err != nil {
		return "", fmt.Errorf("could not read oauth_creds.json: %w", err)
	}

	expiry := time.UnixMilli(creds.ExpiryDate)
	if time.Now().Before(expiry.Add(-30 * time.Second)) {

		cachedToken = creds.AccessToken
		tokenExpiry = expiry
		return cachedToken, nil
	}

	if creds.RefreshToken == "" {
		return "", fmt.Errorf("refresh_token not found; please login again with 'gemini auth'")
	}

	clientID, clientSecret := loadOAuthClient()
	if clientID == "" || clientSecret == "" {
		return "", fmt.Errorf("gemini OAuth info not found (could not read from CLI installation)")
	}

	form := url.Values{}
	form.Set("client_id", clientID)
	form.Set("client_secret", clientSecret)
	form.Set("refresh_token", creds.RefreshToken)
	form.Set("grant_type", "refresh_token")

	resp, err := http.PostForm(tokenEndpoint, form)
	if err != nil {
		return "", fmt.Errorf("token yenilenemedi: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("token refresh failed (%d): %s", resp.StatusCode, body)
	}

	var refreshResp struct {
		AccessToken	string	`json:"access_token"`
		ExpiresIn	int64	`json:"expires_in"`
	}
	if err := json.Unmarshal(body, &refreshResp); err != nil {
		return "", fmt.Errorf("could not parse token response: %w", err)
	}

	newExpiry := time.Now().Add(time.Duration(refreshResp.ExpiresIn) * time.Second)
	creds.AccessToken = refreshResp.AccessToken
	creds.ExpiryDate = newExpiry.UnixMilli()
	writeCreds(creds)

	cachedToken = refreshResp.AccessToken
	tokenExpiry = newExpiry
	return cachedToken, nil
}

func getProjectID(token string) (string, error) {
	mu.Lock()
	if projectID != "" {
		mu.Unlock()
		return projectID, nil
	}
	mu.Unlock()

	reqBody := `{"metadata":{"pluginType":"GEMINI"}}`
	req, _ := http.NewRequest("POST", loadCodeAssistURL, strings.NewReader(reqBody))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("loadCodeAssist error: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	var result struct {
		Project string `json:"cloudaicompanionProject"`
	}
	if err := json.Unmarshal(body, &result); err != nil || result.Project == "" {
		return "", fmt.Errorf("could not get project ID: %s", body)
	}

	mu.Lock()
	projectID = result.Project
	mu.Unlock()
	return result.Project, nil
}

func Get() (*QuotaResult, error) {
	token, err := accessToken()
	if err != nil {
		return &QuotaResult{Available: false}, nil
	}

	proj, err := getProjectID(token)
	if err != nil {
		return &QuotaResult{Available: false}, nil
	}

	reqBody, _ := json.Marshal(map[string]string{"project": proj})
	req, _ := http.NewRequest("POST", retrieveQuotaURL, bytes.NewReader(reqBody))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("retrieveUserQuota error: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("quota API error (%d): %s", resp.StatusCode, body)
	}

	var apiResp struct {
		Buckets []struct {
			ModelID			string	`json:"modelId"`
			RemainingFraction	float64	`json:"remainingFraction"`
			ResetTime		string	`json:"resetTime"`
			TokenType		string	`json:"tokenType"`
		} `json:"buckets"`
	}
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return nil, fmt.Errorf("could not parse quota response: %w", err)
	}

	var totalRemaining, totalCount float64
	var latestReset time.Time
	buckets := make([]QuotaBucket, 0, len(apiResp.Buckets))

	for _, b := range apiResp.Buckets {
		t, _ := time.Parse(time.RFC3339, b.ResetTime)
		buckets = append(buckets, QuotaBucket{
			ModelID:		b.ModelID,
			RemainingFraction:	b.RemainingFraction,
			ResetTime:		t,
			TokenType:		b.TokenType,
		})
		totalRemaining += b.RemainingFraction
		totalCount++
		if t.After(latestReset) {
			latestReset = t
		}
	}

	var usedPct float64
	if totalCount > 0 {
		avgRemaining := totalRemaining / totalCount
		usedPct = (1 - avgRemaining) * 100
	}

	return &QuotaResult{
		Available:	true,
		UsedPct:	usedPct,
		ResetTime:	latestReset,
		Buckets:	buckets,
	}, nil
}
