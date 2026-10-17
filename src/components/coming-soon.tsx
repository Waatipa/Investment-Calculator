import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ComponentProps } from "react";

export function ComingSoonButton(props: ComponentProps<typeof Button>) {
  return <Button {...props} type="button" onClick={() => toast("Coming soon", { duration: 2000 })} />;
}