import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Site-wide configuration</p>
      </div>
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Settings module শীঘ্রই আসছে। এই section-এ থাকবে: site name, default language, contact info,
          payment gateways, email templates, এবং অন্যান্য global preferences।
        </CardContent>
      </Card>
    </div>
  );
}
