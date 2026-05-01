import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

type Note = { id: string; title: string | null; content: string | null; updated_at: string };

export default function CustomerNotes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("consumer_notes")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (error) toast.error(error.message);
    setNotes((data ?? []) as Note[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [user]);

  const startNew = () => {
    setEditing({ id: "", title: "", content: "", updated_at: "" });
    setTitle("");
    setContent("");
  };

  const startEdit = (n: Note) => {
    setEditing(n);
    setTitle(n.title ?? "");
    setContent(n.content ?? "");
  };

  const save = async () => {
    if (!user || !editing) return;
    if (!title.trim() && !content.trim()) {
      toast.error("নোট খালি");
      return;
    }
    setSaving(true);
    if (editing.id) {
      const { error } = await supabase
        .from("consumer_notes")
        .update({ title: title.trim() || null, content: content.trim() || null })
        .eq("id", editing.id);
      if (error) toast.error(error.message);
    } else {
      const { error } = await supabase
        .from("consumer_notes")
        .insert({ user_id: user.id, title: title.trim() || null, content: content.trim() || null });
      if (error) toast.error(error.message);
    }
    setSaving(false);
    setEditing(null);
    void load();
    toast.success("সংরক্ষিত");
  };

  const remove = async (id: string) => {
    if (!confirm("নোটটি মুছবেন?")) return;
    const { error } = await supabase.from("consumer_notes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    void load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">আমার নোট</h1>
        <Button onClick={startNew} size="sm">
          <Plus className="mr-1 h-4 w-4" /> নতুন নোট
        </Button>
      </div>

      {editing && (
        <Card className="space-y-3 p-4">
          <Input
            placeholder="শিরোনাম"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
          />
          <Textarea
            placeholder="এখানে লিখুন…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
          />
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving} size="sm">
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
              সংরক্ষণ
            </Button>
            <Button onClick={() => setEditing(null)} variant="ghost" size="sm">
              বাতিল
            </Button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : notes.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          এখনো কোনো নোট নেই
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {notes.map((n) => (
            <Card key={n.id} className="group relative p-4">
              <button
                onClick={() => remove(n.id)}
                className="absolute right-2 top-2 rounded-md p-1.5 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                aria-label="মুছুন"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => startEdit(n)} className="block w-full text-left">
                {n.title && <div className="mb-1 font-semibold">{n.title}</div>}
                {n.content && (
                  <div className="line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">{n.content}</div>
                )}
                <div className="mt-2 text-[11px] text-muted-foreground">
                  {new Date(n.updated_at).toLocaleString("bn-BD")}
                </div>
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
