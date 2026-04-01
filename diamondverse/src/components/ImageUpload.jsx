import React, { useRef } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function ImageUpload({ bucket, value, onChange, label = 'Image', size = 80 }) {
  const ref = useRef()

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const ext = file.name.split('.').pop()
    const path = `${Date.now()}.${ext}`
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
    if (error) { toast.error('Upload failed'); return }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    onChange(data.publicUrl)
    toast.success('Image uploaded')
  }

  return (
    <div>
      {label && <label>{label}</label>}
      <div
        className="image-upload-area"
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', minHeight: size }}
        onClick={() => ref.current?.click()}
      >
        {value
          ? <img src={value} alt="preview" style={{ width: size, height: size, objectFit: 'cover', borderRadius: 4 }} />
          : <div style={{ color: 'var(--text-3)', fontSize: 13 }}>📷 Click to upload</div>
        }
        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>JPG, PNG, WebP</span>
        <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
      </div>
    </div>
  )
}
