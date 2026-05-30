import React, { useState } from "react";
import { User, Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";

export function RegisterScreen({ onRegister, onSwitchToLogin }) {
  const { language } = useLanguage();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Şifreler uyuşmuyor.");
      return;
    }

    setLoading(true);
    try {

      if (onRegister) {
        await onRegister(formData);
      }
    } catch (err) {
      setError(err.message || "An error occurred during registration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-[400px] space-y-8">
        <div className="flex flex-col items-center text-center space-y-2">
          <Logo className="h-12 w-12 mb-2" />
          <h1 className="text-3xl font-bold tracking-tight">{t("createAccount", language)}</h1>
          <p className="text-muted-foreground">
            Gemini CLI ile projelerinizi akıllıca yönetin
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                name="username"
                placeholder={t("username", language)}
                className="pl-10"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                name="email"
                type="email"
                placeholder={t("email", language)}
                className="pl-10"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                name="password"
                type="password"
                placeholder={t("password", language)}
                className="pl-10"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                name="confirmPassword"
                type="password"
                placeholder={t("confirmPassword", language)}
                className="pl-10"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {error && (
            <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Hesap oluşturuluyor...
              </>
            ) : (
              <>
                Kayıt Ol
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">Zaten bir hesabınız var mı? </span>
          <button
            onClick={onSwitchToLogin}
            className="font-medium text-primary hover:underline"
          >
            Giriş Yap
          </button>
        </div>
      </div>
    </div>
  );
}
