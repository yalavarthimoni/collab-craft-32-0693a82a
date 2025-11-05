import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Download, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FileManagerProps {
  projectId: string;
}

const FileManager = ({ projectId }: FileManagerProps) => {
  const { toast } = useToast();
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchFiles();
  }, [projectId]);

  const fetchFiles = async () => {
    const { data } = await supabase
      .from("file_attachments")
      .select("*, profiles(full_name)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    setFiles(data || []);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${projectId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from("file_attachments")
        .insert({
          project_id: projectId,
          uploaded_by: user.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
        });

      if (dbError) throw dbError;

      toast({
        title: "Success!",
        description: "File uploaded successfully",
      });
      
      fetchFiles();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-files')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Project Files</span>
          <div>
            <Input
              type="file"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
              id="file-upload"
            />
            <Button
              asChild
              variant="gradient"
              disabled={uploading}
            >
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? "Uploading..." : "Upload File"}
              </label>
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {files.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No files uploaded yet
          </p>
        ) : (
          <div className="space-y-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium">{file.file_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Uploaded by {file.profiles?.full_name} •{' '}
                      {new Date(file.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(file.file_size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(file.file_path, file.file_name)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FileManager;
