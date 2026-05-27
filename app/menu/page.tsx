'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import AppShell from '@/components/AppShell'

interface Modifier { id?: string; name: string; type: 'toggle'|'select'; options: string; default_val: string }
interface MenuItem { id: string; name: string; price: number; category: string; description: string; image_url: string; available: boolean }

export default function MenuPage() {
  const supabase = createClient()
  const [items, setItems] = useState<MenuItem[]>([])
  const [restaurantId, setRestaurantId] = useState('')
  const [loading, setLoading] = useState(true)
  const [filterCat, setFilterCat] = useState('Todos')
  const [editing, setEditing] = useState<string|null>(null)
  const [editData, setEditData] = useState<Partial<MenuItem>>({})
  const [modifiers, setModifiers] = useState<Modifier[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({ name:'', price:'', category:'Platos', description:'', image_url:'' })
  const fileRef = useRef<HTMLInputElement>(null)
  const editFileRef = useRef<HTMLInputElement>(null)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: p } = await supabase.from('profiles').select('restaurant_id').eq('id', user.id).single()
    if (!p) return
    setRestaurantId(p.restaurant_id)
    const { data } = await supabase.from('menu_items').select('*').eq('restaurant_id', p.restaurant_id).order('category').order('sort_order')
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function uploadImage(file: File): Promise<string> {
    const ext = file.name.split('.').pop()
    const path = `${restaurantId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('menu-images').upload(path, file)
    if (error) return ''
    const { data } = supabase.storage.from('menu-images').getPublicUrl(path)
    return data.publicUrl
  }

  async function addItem() {
    if (!form.name || !form.price) return
    let imageUrl = form.image_url
    if (fileRef.current?.files?.[0]) {
      setUploading(true)
      imageUrl = await uploadImage(fileRef.current.files[0])
      setUploading(false)
    }
    const { data: newItem } = await supabase.from('menu_items').insert({
      restaurant_id: restaurantId,
      name: form.name, price: Number(form.price),
      category: form.category, description: form.description,
      image_url: imageUrl, available: true,
    }).select().single()
    setForm({ name:'', price:'', category:'Platos', description:'', image_url:'' })
    setShowAdd(false)
    load()
  }

  async function deleteItem(id: string) {
    if (!confirm('¿Eliminar este plato?')) return
    await supabase.from('menu_items').delete().eq('id', id)
    load()
  }

  async function toggleAvailable(id: string, current: boolean) {
    await supabase.from('menu_items').update({ available: !current }).eq('id', id)
    load()
  }

  async function startEdit(item: MenuItem) {
    setEditing(item.id)
    setEditData({ ...item })
    const { data: mods } = await supabase.from('menu_modifiers').select('*').eq('menu_item_id', item.id)
    setModifiers((mods || []).map(m => ({ ...m, options: (m.options || []).join(',') })))
  }

  async function saveEdit() {
    if (!editing) return
    let imageUrl = editData.image_url || ''
    if (editFileRef.current?.files?.[0]) {
      setUploading(true)
      imageUrl = await uploadImage(editFileRef.current.files[0])
      setUploading(false)
      setEditData(prev => ({ ...prev, image_url: imageUrl }))
    }
    await supabase.from('menu_items').update({ ...editData, image_url: imageUrl }).eq('id', editing)
    await supabase.from('menu_modifiers').delete().eq('menu_item_id', editing)
    for (const mod of modifiers) {
      if (!mod.name) continue
      await supabase.from('menu_modifiers').insert({
        menu_item_id: editing, name: mod.name, type: mod.type,
        options: mod.type === 'select' ? mod.options.split(',').map(s=>s.trim()) : null,
        default_val: mod.default_val,
      })
    }
    setEditing(null)
    load()
  }

  const cats = ['Todos', ...Array.from(new Set(items.map(i => i.category)))]
  const filtered = filterCat === 'Todos' ? items : items.filter(i => i.category === filterCat)

  return (
    <AppShell>
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-lg font-semibold text-gray-900">Gestión del menú</h1>
          <button onClick={() => setShowAdd(!showAdd)} className="btn-primary">+ Nuevo plato</button>
        </div>

        {/* Formulario agregar */}
        {showAdd && (
          <div className="card mb-5 border-brand-500 border">
            <div className="text-sm font-medium text-gray-800 mb-4">Nuevo plato</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nombre *</label>
                <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ej: Tacos de pollo" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Precio *</label>
                <input type="number" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} placeholder="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Categoría</label>
                <input value={form.category} onChange={e=>setForm({...form,category:e.target.value})} placeholder="Platos, Bebidas, Postres..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Foto del plato</label>
                <input ref={fileRef} type="file" accept="image/*" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Descripción</label>
                <input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Descripción del plato..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={addItem} disabled={uploading} className="btn-primary">{uploading ? 'Subiendo...' : 'Guardar plato'}</button>
              <button onClick={() => setShowAdd(false)} className="btn-ghost">Cancelar</button>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {cats.map(cat => (
            <button key={cat} onClick={() => setFilterCat(cat)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filterCat===cat?'bg-brand-500 text-white border-brand-500':'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              {cat} {cat!=='Todos'&&`(${items.filter(i=>i.category===cat).length})`}
            </button>
          ))}
        </div>

        {/* Lista de platos */}
        {loading ? <p className="text-sm text-gray-400">Cargando...</p> : (
          <div className="space-y-3">
            {filtered.map(item => (
              <div key={item.id} className={`bg-white border rounded-xl overflow-hidden ${!item.available ? 'opacity-60' : 'border-gray-100'}`}>
                {editing === item.id ? (
                  /* Modo edición */
                  <div className="p-4">
                    <div className="text-sm font-medium text-gray-800 mb-3">Editando: {item.name}</div>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Nombre</label>
                        <input value={editData.name||''} onChange={e=>setEditData({...editData,name:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Precio</label>
                        <input type="number" value={editData.price||''} onChange={e=>setEditData({...editData,price:Number(e.target.value)})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Categoría</label>
                        <input value={editData.category||''} onChange={e=>setEditData({...editData,category:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-gray-500 mb-1 block">Descripción</label>
                        <input value={editData.description||''} onChange={e=>setEditData({...editData,description:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Nueva foto</label>
                        <input ref={editFileRef} type="file" accept="image/*" className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs"/>
                      </div>
                    </div>

                    {/* Modificadores */}
                    <div className="border-t border-gray-100 pt-3 mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-medium text-gray-700">Modificadores / Ingredientes</div>
                        <button onClick={() => setModifiers([...modifiers, {name:'',type:'toggle',options:'',default_val:'true'}])}
                          className="text-xs text-brand-500 hover:underline">+ Agregar</button>
                      </div>
                      {modifiers.map((mod, i) => (
                        <div key={i} className="grid grid-cols-5 gap-2 mb-2 items-center">
                          <input value={mod.name} onChange={e=>{const m=[...modifiers];m[i]={...m[i],name:e.target.value};setModifiers(m)}}
                            placeholder="Ej: Tomate" className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs"/>
                          <select value={mod.type} onChange={e=>{const m=[...modifiers];m[i]={...m[i],type:e.target.value as any};setModifiers(m)}}
                            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs">
                            <option value="toggle">Sí/No</option>
                            <option value="select">Selección</option>
                          </select>
                          {mod.type==='select' && (
                            <input value={mod.options} onChange={e=>{const m=[...modifiers];m[i]={...m[i],options:e.target.value};setModifiers(m)}}
                              placeholder="Op1, Op2, Op3" className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs col-span-2"/>
                          )}
                          {mod.type==='toggle' && (
                            <label className="flex items-center gap-1 text-xs text-gray-600 col-span-2">
                              <input type="checkbox" checked={mod.default_val==='true'}
                                onChange={e=>{const m=[...modifiers];m[i]={...m[i],default_val:e.target.checked?'true':'false'};setModifiers(m)}}/>
                              Incluido por defecto
                            </label>
                          )}
                          <button onClick={()=>setModifiers(modifiers.filter((_,j)=>j!==i))}
                            className="text-red-400 hover:text-red-600 text-xs">✕</button>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <button onClick={saveEdit} disabled={uploading} className="btn-primary text-sm">{uploading?'Subiendo...':'Guardar cambios'}</button>
                      <button onClick={()=>setEditing(null)} className="btn-ghost text-sm">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  /* Vista normal */
                  <div className="flex items-center gap-4 p-4">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-16 h-16 object-cover rounded-lg flex-shrink-0"/>
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 text-2xl">🍽️</div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800">{item.name}</span>
                        <span className="badge badge-gray text-xs">{item.category}</span>
                        {!item.available && <span className="badge badge-danger text-xs">No disponible</span>}
                      </div>
                      {item.description && <div className="text-xs text-gray-400 mt-0.5">{item.description}</div>}
                      <div className="text-sm font-semibold text-brand-600 mt-1">${item.price}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleAvailable(item.id, item.available)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${item.available?'border-gray-200 text-gray-500 hover:bg-gray-50':'bg-brand-50 border-brand-200 text-brand-600'}`}>
                        {item.available ? 'Desactivar' : 'Activar'}
                      </button>
                      <button onClick={() => startEdit(item)} className="btn-ghost text-xs px-3 py-1.5">✏️ Editar</button>
                      <button onClick={() => deleteItem(item.id)} className="text-xs px-3 py-1.5 border border-red-200 text-red-500 hover:bg-red-50 rounded-lg">🗑️</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="card text-center py-10">
                <div className="text-3xl mb-2">🍽️</div>
                <div className="text-sm text-gray-600">No hay platos en esta categoría</div>
                <button onClick={() => setShowAdd(true)} className="btn-primary mt-3 text-sm">+ Agregar primer plato</button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
