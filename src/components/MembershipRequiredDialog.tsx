import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MembershipRequiredDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const MembershipRequiredDialog = ({ isOpen, onClose, onConfirm }: MembershipRequiredDialogProps) => {
  if (!isOpen) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Active Membership Required</AlertDialogTitle>
          <AlertDialogDescription>
            It looks like you don't have an active membership. You need a membership to book classes.
            <br /><br />
            Would you like to view our membership plans?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} variant="outline">Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} variant="default">
            View Plans
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
