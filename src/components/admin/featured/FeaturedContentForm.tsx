
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFeaturedContent } from "@/services/featuredContentService";
import { v4 as uuidv4 } from 'uuid';
import { uploadImage } from "@/services/imageUploadService";
import { useAuth } from "@/context/AuthContext";

const FeaturedContentForm: React.FC = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [link, setLink] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { session } = useAuth();

  const createProductMutation = useMutation({
    mutationFn: createFeaturedContent,
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["featuredContent"]});
      setName("");
      setDescription("");
      setImageUrl("");
      setLink("");
      setImageFile(null);
      toast({
        title: "Success",
        description: "Product added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add product",
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = async (file: File) => {
    try {
      if (!session?.user?.id) {
        toast({
          title: "Error",
          description: "User session not found",
          variant: "destructive",
        });
        return;
      }

      const imageName = `${session.user.id}-${uuidv4()}`;
      const uploadedUrl = await uploadImage(file, imageName);

      if (uploadedUrl) {
        setImageUrl(uploadedUrl);
        toast({
          title: "Success",
          description: "Image uploaded successfully!",
        });
      } else {
        toast({
          title: "Error",
          description: "Image upload failed.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Image upload error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !description || !imageUrl || !link) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    createProductMutation.mutate({
      name,
      description,
      image_url: imageUrl,
      link,
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      handleImageUpload(file);
    }
  };

  return (
    <Card className="lolcow-card">
      <CardHeader>
        <CardTitle>Add New Product</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Product Name"
            />
          </div>
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Product Description"
            />
          </div>
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="image">Image Upload</Label>
            <Input
              type="file"
              id="image"
              accept="image/*"
              onChange={handleImageChange}
            />
            {imageUrl && (
              <img
                src={imageUrl}
                alt="Uploaded"
                className="w-24 h-24 object-cover rounded mt-2"
              />
            )}
          </div>
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="link">Link</Label>
            <Input
              type="url"
              id="link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Product Link"
            />
          </div>
          <Button 
            type="submit" 
            disabled={createProductMutation.isPending}
          >
            {createProductMutation.isPending ? "Adding..." : "Add Product"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default FeaturedContentForm;
