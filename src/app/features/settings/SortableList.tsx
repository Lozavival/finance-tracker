import { useState } from 'react';
import { GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/primitives/button';
import { useI18n } from '@/i18n';

type SortableItemProps<T> = {
  item?: T;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  children: React.ReactNode;
  actions?: React.ReactNode;
  isDragging?: boolean;
};

export function SortableRow<T>({
  index,
  total,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  children,
  actions,
  isDragging = false,
}: SortableItemProps<T>) {
  const { t } = useI18n();

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 p-3 rounded-lg border border-border/60 bg-foreground/[0.02] hover:bg-foreground/[0.05] transition-all group ${
        isDragging ? 'opacity-40 border-dashed border-theme-cyan' : ''
      }`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div
          className="cursor-grab active:cursor-grabbing text-muted-foreground group-hover:text-foreground p-1 hover:bg-foreground/10 rounded transition-colors shrink-0"
          title={t('common.dragToReorder')}
        >
          <GripVertical className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">{children}</div>
      </div>

      <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 shrink-0 ml-7 sm:ml-0">
        {actions}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={index === 0}
          onClick={onMoveUp}
          className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-20"
          title={t('common.moveUp')}
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={index === total - 1}
          onClick={onMoveDown}
          className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-20"
          title={t('common.moveDown')}
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function useReorder<T>(items: T[], onChange: (items: T[]) => void) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  function move(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return;
    const next = [...items];
    const [removed] = next.splice(from, 1);
    next.splice(to, 0, removed);
    onChange(next);
  }

  function handleDragStart(index: number) {
    return (e: React.DragEvent) => {
      setDraggedIndex(index);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index.toString());
    };
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(toIndex: number) {
    return (e: React.DragEvent) => {
      e.preventDefault();
      if (draggedIndex !== null && draggedIndex !== toIndex) {
        move(draggedIndex, toIndex);
      }
      setDraggedIndex(null);
    };
  }

  function handleDragEnd() {
    setDraggedIndex(null);
  }

  return {
    draggedIndex,
    move,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
  };
}
