import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { StickyNote as StickyNoteIcon, X, Plus, Trash2, Pin, PinOff } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface StickyNote {
  id: string;
  content: string;
  color: string;
  position_x?: number;
  position_y?: number;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

const COLORS = [
  { name: "Yellow", value: "bg-yellow-200 border-yellow-300" },
  { name: "Blue", value: "bg-blue-200 border-blue-300" },
  { name: "Green", value: "bg-green-200 border-green-300" },
  { name: "Pink", value: "bg-pink-200 border-pink-300" },
  { name: "Purple", value: "bg-purple-200 border-purple-300" },
];

export const StickyNotes = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0].value);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const handleOpenNotes = () => setIsOpen(true);
    window.addEventListener('open-sticky-notes', handleOpenNotes);
    return () => window.removeEventListener('open-sticky-notes', handleOpenNotes);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotes();
    }
  }, [isOpen]);

  const fetchNotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("sticky_notes")
        .select("*")
        .eq("user_id", user.id)
        .order("is_pinned", { ascending: false })
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error("Error fetching notes", error);
    }
  };

  const handleCreate = async () => {
    if (!newNote.trim()) {
      toast.error("Note cannot be empty");
      return;
    }

    try {
      setIsCreating(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("sticky_notes")
        .insert({
          user_id: user.id,
          content: newNote.trim(),
          color: selectedColor,
          is_pinned: false,
        } as any);

      if (error) throw error;

      toast.success("Note created!");
      setNewNote("");
      fetchNotes();
    } catch (error: any) {
      toast.error("Error creating note");
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!noteToDelete) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("sticky_notes")
        .delete()
        .eq("id", noteToDelete)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Note deleted!");
      setDeleteConfirmOpen(false);
      setNoteToDelete(null);
      fetchNotes();
    } catch (error) {
      toast.error("Error deleting note");
    }
  };

  const handleTogglePin = async (noteId: string, currentPinState: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("sticky_notes")
        .update({ is_pinned: !currentPinState })
        .eq("id", noteId)
        .eq("user_id", user.id);

      if (error) throw error;

      fetchNotes();
    } catch (error) {
      toast.error("Error updating note");
    }
  };

  const handleUpdateContent = async (noteId: string, content: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("sticky_notes")
        .update({ content, updated_at: new Date().toISOString() })
        .eq("id", noteId)
        .eq("user_id", user.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating note", error);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <StickyNoteIcon className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Sticky Notes</h2>
            <span className="text-sm text-muted-foreground">({notes.length})</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Create New Note */}
          <div className="p-4 border-b bg-muted/30">
            <div className="space-y-2">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Write a note..."
                rows={3}
                className="resize-none"
              />
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {COLORS.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setSelectedColor(color.value)}
                      className={`w-6 h-6 rounded border-2 ${
                        selectedColor === color.value ? "border-foreground" : "border-transparent"
                      } ${color.value}`}
                      title={color.name}
                    />
                  ))}
                </div>
                <Button onClick={handleCreate} disabled={isCreating || !newNote.trim()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
              </div>
            </div>
          </div>

          {/* Notes Grid */}
          <ScrollArea className="flex-1 p-4">
            {notes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <StickyNoteIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No notes yet. Create your first note above!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {notes.map((note) => (
                  <Card
                    key={note.id}
                    className={`${note.color} relative group min-h-[150px] flex flex-col`}
                  >
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTogglePin(note.id, note.is_pinned)}
                        className="h-6 w-6 p-0"
                      >
                        {note.is_pinned ? (
                          <Pin className="h-3 w-3 fill-current" />
                        ) : (
                          <PinOff className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setNoteToDelete(note.id);
                          setDeleteConfirmOpen(true);
                        }}
                        className="h-6 w-6 p-0 text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    {note.is_pinned && (
                      <div className="absolute top-2 left-2">
                        <Pin className="h-4 w-4 fill-current text-muted-foreground" />
                      </div>
                    )}
                    <Textarea
                      value={note.content}
                      onChange={(e) => {
                        const newNotes = notes.map(n =>
                          n.id === note.id ? { ...n, content: e.target.value } : n
                        );
                        setNotes(newNotes);
                      }}
                      onBlur={(e) => handleUpdateContent(note.id, e.target.value)}
                      className={`${note.color} border-0 resize-none flex-1 min-h-[120px] focus-visible:ring-0`}
                      placeholder="Note content..."
                    />
                    <div className="text-xs text-muted-foreground mt-auto pt-2 border-t border-black/10">
                      {new Date(note.updated_at).toLocaleDateString()}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </Card>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleDelete}
        title="Delete Note"
        description="Are you sure you want to delete this note? This action cannot be undone."
        variant="destructive"
        confirmText="Delete"
      />
    </div>
  );
};

