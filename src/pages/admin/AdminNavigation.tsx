
import React from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import NavigationManager from "@/components/admin/navigation/NavigationManager";

const AdminNavigation: React.FC = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-fredoka text-white">Navigation Management</h1>
          <p className="text-gray-400 mt-1">Enable or disable navigation items throughout the site</p>
        </div>

        <Card className="lolcow-card">
          <CardHeader>
            <CardTitle>Site Navigation</CardTitle>
            <CardDescription>
              Toggle navigation items on or off. Disabled items will not appear in the navigation bar for regular users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NavigationManager />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminNavigation;
