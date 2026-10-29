import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/primitives/alert-dialog';
import { type GoalCategory } from '@/data/goals';
import { useI18n } from '@/i18n';
import { logger } from '@/lib/logger';

const deleteCategoryLogger = logger.child('DeleteCategoryDialog');

type DeleteCategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: GoalCategory | null;
  onConfirm: (categoryId: string) => void;
};

export function DeleteCategoryDialog({ open, onOpenChange, category, onConfirm }: DeleteCategoryDialogProps) {
  const { t } = useI18n();
  if (!category) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-popover border-border">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">
            {t('goals.deleteConfirmTitle', { name: category.name })}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            {t('goals.deleteConfirmDesc', { percent: String(category.percentage) })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              deleteCategoryLogger.info('User confirmed goal category deletion', {
                categoryId: category.id,
                name: category.name,
              });
              onConfirm(category.id);
              onOpenChange(false);
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t('goals.deleteCategory')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
