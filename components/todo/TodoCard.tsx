"use client";

import * as React from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { EditIcon, TrashIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Todo, Priority } from "./types";

interface TodoCardProps {
  todo: Todo;
  onToggleComplete?: (id: string, completed: boolean) => void;
  onEdit?: (todo: Todo) => void;
  onDelete?: (id: string) => void;
}

const priorityConfig: Record<Priority, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  high: { label: "높음", variant: "destructive" },
  medium: { label: "중간", variant: "default" },
  low: { label: "낮음", variant: "secondary" },
};

export function TodoCard({
  todo,
  onToggleComplete,
  onEdit,
  onDelete,
}: TodoCardProps) {
  const priority = priorityConfig[todo.priority];

  const handleToggleComplete = (checked: boolean) => {
    onToggleComplete?.(todo.id, checked);
  };

  const handleEdit = () => {
    onEdit?.(todo);
  };

  const handleDelete = () => {
    onDelete?.(todo.id);
  };

  const isOverdue = todo.due_date && !todo.completed && new Date(todo.due_date) < new Date();

  return (
    <Card
      className={cn(
        "transition-all hover:shadow-md",
        todo.completed && "opacity-60"
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Checkbox
              checked={todo.completed}
              onCheckedChange={handleToggleComplete}
              className="mt-1"
            />
            <div className="flex-1 min-w-0">
              <CardTitle
                className={cn(
                  "text-lg",
                  todo.completed && "line-through text-muted-foreground"
                )}
              >
                {todo.title}
              </CardTitle>
              {todo.description && (
                <CardDescription className="mt-1 line-clamp-2">
                  {todo.description}
                </CardDescription>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={priority.variant}>{priority.label}</Badge>
          {todo.category && (
            <Badge variant="outline">{todo.category === "none" ? "없음" : todo.category}</Badge>
          )}
          {todo.due_date && (
            <Badge
              variant={isOverdue ? "destructive" : "outline"}
              className="text-xs"
            >
              {format(new Date(todo.due_date), "yyyy년 MM월 dd일", {
                locale: ko,
              })}
            </Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex justify-end gap-2">
        {onEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEdit}
            disabled={todo.completed}
          >
            <EditIcon className="size-4" />
            수정
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="text-destructive hover:text-destructive"
          >
            <TrashIcon className="size-4" />
            삭제
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

