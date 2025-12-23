"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SparklesIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Todo, TodoFormData, Priority } from "./types";

const todoFormSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요"),
  description: z.string().optional(),
  due_date: z.string().optional(),
  priority: z.enum(["high", "medium", "low"]),
  category: z.string().optional(),
});

type TodoFormValues = z.infer<typeof todoFormSchema>;

interface TodoFormProps {
  todo?: Todo;
  onSubmit: (data: TodoFormData) => void | Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

const priorityOptions: { value: Priority; label: string }[] = [
  { value: "high", label: "높음" },
  { value: "medium", label: "중간" },
  { value: "low", label: "낮음" },
];

const categoryOptions = ["업무", "개인", "학습", "기타"];

export function TodoForm({
  todo,
  onSubmit,
  onCancel,
  isLoading = false,
}: TodoFormProps) {
  const [aiInput, setAiInput] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);

  const form = useForm<TodoFormValues>({
    resolver: zodResolver(todoFormSchema),
    defaultValues: {
      title: todo?.title ?? "",
      description: todo?.description ?? "",
      due_date: todo?.due_date
        ? new Date(todo.due_date).toISOString().slice(0, 16)
        : "",
      priority: todo?.priority ?? "medium",
      category: todo?.category ?? "",
    },
  });

  const handleSubmit = async (data: TodoFormValues) => {
    const formData: TodoFormData = {
      ...data,
      due_date: data.due_date ? new Date(data.due_date).toISOString() : undefined,
    };
    await onSubmit(formData);
    // 새 할 일 추가 후 폼 초기화
    if (!todo) {
      form.reset({
        title: "",
        description: "",
        due_date: "",
        priority: "medium",
        category: "",
      });
    }
  };

  const handleAiGenerate = async () => {
    if (!aiInput.trim()) {
      toast.error("자연어로 할 일을 입력해주세요.");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai/todos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: aiInput }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "AI 생성에 실패했습니다.");
      }

      const data = await response.json();

      // 폼에 생성된 데이터 채우기
      form.setValue("title", data.title || "");
      if (data.description) {
        form.setValue("description", data.description);
      }
      if (data.due_date) {
        // ISO 형식에서 datetime-local 형식으로 변환
        const dateTime = new Date(data.due_date).toISOString().slice(0, 16);
        form.setValue("due_date", dateTime);
      }
      form.setValue("priority", data.priority || "medium");
      if (data.category) {
        form.setValue("category", data.category);
      }

      toast.success("할 일이 생성되었습니다. 확인 후 저장해주세요.");
      setAiInput("");
    } catch (error) {
      console.error("AI generation error:", error);
      toast.error(
        error instanceof Error ? error.message : "AI 생성 중 오류가 발생했습니다."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{todo ? "할 일 수정" : "새 할 일 추가"}</CardTitle>
        {!todo && (
          <CardDescription>
            자연어로 입력하면 AI가 자동으로 구조화해줍니다
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {/* AI 기반 할 일 생성 */}
        {!todo && (
          <div className="mb-6 space-y-3 rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center gap-2">
              <SparklesIcon className="size-4 text-primary" />
              <label htmlFor="aiInput" className="text-sm font-medium">AI로 할 일 생성</label>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="예: 내일 오후 3시까지 중요한 팀 회의 준비하기"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !isGenerating) {
                    e.preventDefault();
                    handleAiGenerate();
                  }
                }}
                disabled={isGenerating}
              />
              <Button
                type="button"
                onClick={handleAiGenerate}
                disabled={isGenerating || !aiInput.trim()}
                size="icon"
              >
                {isGenerating ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <SparklesIcon className="size-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter 키를 눌러 생성할 수 있습니다
            </p>
          </div>
        )}

        {!todo && <Separator className="mb-4" />}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>제목 *</FormLabel>
                  <FormControl>
                    <Input placeholder="할 일 제목을 입력하세요" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>설명</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="상세 설명을 입력하세요 (선택사항)"
                      className="min-h-24"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>우선순위</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="우선순위 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {priorityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>카테고리</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value && field.value !== "" ? field.value : undefined}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="카테고리 선택 (선택사항)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">없음</SelectItem>
                        {categoryOptions.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>마감일</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormDescription>
                    마감일시를 선택하세요 (선택사항)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isLoading}
                >
                  취소
                </Button>
              )}
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "저장 중..." : todo ? "수정" : "추가"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

