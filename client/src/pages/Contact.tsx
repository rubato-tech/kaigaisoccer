import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("すべての項目を入力してください。");
      return;
    }
    setIsSubmitting(true);
    // Formspree / mailto フォールバック（外部サービス不要）
    try {
      const mailto = `mailto:contact@kaigaisoccer.com?subject=${encodeURIComponent(`お問い合わせ: ${name}`)}&body=${encodeURIComponent(`名前: ${name}\nメール: ${email}\n\n${message}`)}`;
      window.location.href = mailto;
      setSubmitted(true);
    } catch {
      toast.error("送信に失敗しました。直接メールでお問い合わせください。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-xl py-10">
        <Button variant="ghost" size="sm" className="mb-6 gap-1.5" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            トップに戻る
          </Link>
        </Button>

        <h1 className="font-serif text-3xl font-black text-primary mb-2">お問い合わせ</h1>
        <p className="text-sm text-muted-foreground mb-8">
          試合データの誤り・機能のご要望・広告に関するお問い合わせはこちらからどうぞ。
        </p>

        {submitted ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <CheckCircle className="mx-auto mb-3 h-12 w-12 text-green-500" />
            <h2 className="font-serif text-xl font-bold text-foreground mb-2">ありがとうございます</h2>
            <p className="text-sm text-muted-foreground">
              メールクライアントが開きます。送信ボタンを押してお問い合わせを完了してください。
            </p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/">トップに戻る</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">お名前 <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="山田 太郎"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">メールアドレス <span className="text-destructive">*</span></Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="message">お問い合わせ内容 <span className="text-destructive">*</span></Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="お問い合わせ内容をご記入ください…"
                rows={5}
                required
              />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
              <Send className="h-4 w-4" />
              {isSubmitting ? "送信中…" : "送信する"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              または直接メール:&nbsp;
              <a href="mailto:contact@kaigaisoccer.com" className="text-primary underline">
                contact@kaigaisoccer.com
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
