import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Plus, X, Pencil, Trash2, Sparkles, Save } from "lucide-react";

export default function CommentSnippets({ onInsert }) {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null); // {id?, title, text, category}
  const [q, setQ] = useState("");

  const load = async () => {
    const { data } = await api.get("/comment-templates");
    setList(data);
  };
  useEffect(() => { load(); }, []);

  const filtered = list.filter(t =>
    q === "" || t.title.toLowerCase().includes(q.toLowerCase()) || t.category.toLowerCase().includes(q.toLowerCase())
  );

  const save = async () => {
    if (!editing?.title?.trim() || !editing?.text?.trim()) return;
    const payload = { title: editing.title, text: editing.text, category: editing.category || "General" };
    if (editing.id) await api.put(`/comment-templates/${editing.id}`, payload);
    else await api.post("/comment-templates", payload);
    setEditing(null);
    await load();
  };

  const remove = async (id) => {
    if (!confirm("Delete this snippet?")) return;
    await api.delete(`/comment-templates/${id}`);
    await load();
  };

  const cats = Array.from(new Set(list.map(t => t.category)));

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
          <Sparkles size={12} className="text-rose-700"/> Pathologist Snippets
        </div>
        <button
          type="button"
          data-testid="open-snippets-manager"
          onClick={() => setOpen(true)}
          className="text-xs font-semibold text-rose-700 hover:underline"
        >
          Manage →
        </button>
      </div>

      {list.length === 0 ? (
        <div className="text-xs text-slate-400 italic">No snippets yet — click Manage to add one.</div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {list.slice(0, 12).map(t => (
            <button
              type="button"
              key={t.id}
              data-testid="snippet-chip"
              title={t.text}
              onClick={() => onInsert(t.text)}
              className="group inline-flex items-center gap-1 pl-2.5 pr-2 py-1 rounded-full border border-slate-200 bg-white hover:border-rose-300 hover:bg-rose-50 transition text-xs"
            >
              <Plus size={11} className="text-rose-700"/>
              <span className="font-medium text-slate-700">{t.title}</span>
              <span className="text-[10px] text-slate-400 group-hover:text-rose-700">· {t.category}</span>
            </button>
          ))}
          {list.length > 12 && (
            <button type="button" onClick={() => setOpen(true)} className="text-xs text-slate-500 hover:text-rose-700 self-center">
              +{list.length - 12} more
            </button>
          )}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-rose-700">Comment Templates</div>
                <h3 className="font-display font-bold text-xl mt-0.5">Pathologist Snippets</h3>
              </div>
              <button type="button" onClick={() => { setOpen(false); setEditing(null); }} className="p-1"><X size={20}/></button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {!editing && (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      value={q} onChange={e=>setQ(e.target.value)}
                      placeholder="Search by title or category..."
                      className="flex-1 h-10 px-3 rounded border border-slate-300 focus:border-rose-500 outline-none text-sm"
                    />
                    <button
                      type="button"
                      data-testid="snippet-add-new"
                      onClick={() => setEditing({ title: "", text: "", category: cats[0] || "General" })}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-semibold text-sm"
                    >
                      <Plus size={14}/> New
                    </button>
                  </div>

                  <div className="space-y-2">
                    {filtered.map(t => (
                      <div key={t.id} className="border border-slate-200 rounded-lg p-3 hover:border-rose-200 transition">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-slate-900">{t.title}</span>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">{t.category}</span>
                            </div>
                            <div className="text-xs text-slate-600 mt-1 line-clamp-2">{t.text}</div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button type="button" onClick={() => { onInsert(t.text); }} className="px-2 py-1 rounded text-xs font-semibold text-rose-700 hover:bg-rose-50">Insert</button>
                            <button type="button" onClick={() => setEditing(t)} className="p-1.5 text-slate-500 hover:text-slate-900"><Pencil size={14}/></button>
                            <button type="button" onClick={() => remove(t.id)} className="p-1.5 text-slate-400 hover:text-rose-700"><Trash2 size={14}/></button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {filtered.length === 0 && <div className="text-sm text-slate-500 text-center py-8">No snippets match your search.</div>}
                  </div>
                </>
              )}

              {editing && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 uppercase">Title</label>
                    <input
                      data-testid="snippet-title"
                      value={editing.title} onChange={e=>setEditing({ ...editing, title: e.target.value })}
                      placeholder="e.g. Mild microcytic anemia"
                      className="mt-1 w-full h-10 px-3 rounded border border-slate-300 focus:border-rose-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 uppercase">Category</label>
                    <input
                      list="snippet-cats"
                      data-testid="snippet-category"
                      value={editing.category} onChange={e=>setEditing({ ...editing, category: e.target.value })}
                      placeholder="e.g. Hematology"
                      className="mt-1 w-full h-10 px-3 rounded border border-slate-300 focus:border-rose-500 outline-none"
                    />
                    <datalist id="snippet-cats">
                      {cats.map(c => <option key={c} value={c}/>)}
                    </datalist>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 uppercase">Comment Text</label>
                    <textarea
                      data-testid="snippet-text"
                      value={editing.text} onChange={e=>setEditing({ ...editing, text: e.target.value })}
                      rows={5}
                      className="mt-1 w-full px-3 py-2 rounded border border-slate-300 focus:border-rose-500 outline-none text-sm"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg border border-slate-300 font-semibold text-sm">Cancel</button>
                    <button
                      data-testid="snippet-save"
                      type="button" onClick={save}
                      className="inline-flex items-center gap-1 px-5 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-semibold text-sm"
                    >
                      <Save size={14}/> Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
