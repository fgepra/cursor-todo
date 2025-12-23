"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckSquareIcon, AlertCircleIcon, Loader2Icon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const signupFormSchema = z
  .object({
    email: z.string().email("올바른 이메일 주소를 입력해주세요"),
    password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
    confirmPassword: z.string().min(6, "비밀번호 확인을 입력해주세요"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다",
    path: ["confirmPassword"],
  });

type SignupFormValues = z.infer<typeof signupFormSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // 로그인된 사용자 체크 (이미 middleware에서 처리되지만 클라이언트 사이드에서도 확인)
  React.useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        router.push("/");
      }
    };
    checkUser();
  }, [router]);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const supabase = createClient();

      const { data: signUpData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });

      if (error) {
        // 사용자 친화적인 오류 메시지 변환
        let userFriendlyMessage = "회원가입 중 오류가 발생했습니다.";

        if (error.message.includes("already registered")) {
          userFriendlyMessage = "이미 가입된 이메일입니다.";
        } else if (error.message.includes("invalid email")) {
          userFriendlyMessage = "올바른 이메일 형식이 아닙니다.";
        } else if (error.message.includes("password")) {
          userFriendlyMessage = "비밀번호가 너무 짧거나 약합니다.";
        } else if (error.message.includes("rate limit")) {
          userFriendlyMessage = "너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.";
        } else {
          userFriendlyMessage = error.message || userFriendlyMessage;
        }

        setErrorMessage(userFriendlyMessage);
        return;
      }

      // 회원가입 성공
      if (signUpData.user) {
        // 이메일 확인이 필요한 경우
        if (signUpData.user.confirmed_at === null) {
          setSuccessMessage(
            "회원가입이 완료되었습니다. 이메일을 확인하여 계정을 활성화해주세요."
          );
          // 3초 후 로그인 페이지로 이동
          setTimeout(() => {
            router.push("/login");
          }, 3000);
        } else {
          // 이메일 확인이 필요 없는 경우 (설정에 따라)
          router.push("/");
        }
      }
    } catch (error) {
      console.error("Signup error:", error);
      setErrorMessage("예상치 못한 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* 로고 및 소개 */}
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="flex items-center justify-center size-16 rounded-full bg-primary/10">
            <CheckSquareIcon className="size-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">할 일 관리</h1>
            <p className="text-muted-foreground">
              AI 기반 할 일 관리 서비스로 생산성을 높여보세요
            </p>
          </div>
        </div>

        {/* 회원가입 폼 */}
        <Card>
          <CardHeader>
            <CardTitle>회원가입</CardTitle>
            <CardDescription>
              새 계정을 만들어 할 일 관리를 시작하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* 오류 메시지 */}
            {errorMessage && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircleIcon className="size-4" />
                <AlertTitle>오류</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            {/* 성공 메시지 */}
            {successMessage && (
              <Alert className="mb-4">
                <CheckSquareIcon className="size-4" />
                <AlertTitle>성공</AlertTitle>
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>이메일</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="example@email.com"
                          autoComplete="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>비밀번호</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="비밀번호를 입력하세요 (최소 6자)"
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        비밀번호는 최소 6자 이상이어야 합니다
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>비밀번호 확인</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="비밀번호를 다시 입력하세요"
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2Icon className="mr-2 size-4 animate-spin" />
                      가입 중...
                    </>
                  ) : (
                    "회원가입"
                  )}
                </Button>
              </form>
            </Form>

            <Separator className="my-6" />

            <div className="text-center text-sm">
              <span className="text-muted-foreground">이미 계정이 있으신가요? </span>
              <Link
                href="/login"
                className="font-medium text-primary hover:underline"
              >
                로그인
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

