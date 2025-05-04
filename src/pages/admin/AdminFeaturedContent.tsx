
import React from "react";
import AdminLayout from "@/components/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { getFeaturedContent } from "@/services/featuredContentService";
import FeaturedContentTable from "@/components/admin/featured/FeaturedContentTable";
import FeaturedContentForm from "@/components/admin/featured/FeaturedContentForm";

const AdminFeaturedContent: React.FC = () => {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["featuredContent"],
    queryFn: getFeaturedContent
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-fredoka text-white">Featured Content</h1>
          <p className="text-gray-400 mt-1">Manage featured content on the homepage</p>
        </div>

        {/* Current Products */}
        <FeaturedContentTable products={products} isLoading={isLoading} />

        {/* Add New Product */}
        <FeaturedContentForm />
      </div>
    </AdminLayout>
  );
};

export default AdminFeaturedContent;
