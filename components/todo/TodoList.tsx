"use client";

import * as React from "react";
import { TodoCard } from "./TodoCard";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import type { Todo } from "./types";

interface TodoListProps {
  todos: Todo[];
  onToggleComplete?: (id: string, completed: boolean) => void;
  onEdit?: (todo: Todo) => void;
  onDelete?: (id: string) => void;
}

export function TodoList({
  todos,
  onToggleComplete,
  onEdit,
  onDelete,
}: TodoListProps) {
  if (todos.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>할 일이 없습니다</EmptyTitle>
          <EmptyDescription>새로운 할 일을 추가해보세요</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      {todos.map((todo) => (
        <TodoCard
          key={todo.id}
          todo={todo}
          onToggleComplete={onToggleComplete}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

