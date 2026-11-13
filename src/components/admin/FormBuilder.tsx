import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Check,
  AlertCircle,
  Table,
  Sliders,
  Eye,
  Copy,
  RotateCcw,
} from 'lucide-react';
import { FormField, FieldType } from '../../types';

interface Props {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
}

export const FormBuilder: React.FC<Props> = ({ fields, onChange }) => {
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [fieldToDelete, setFieldToDelete] = useState<FormField | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [optionsInput, setOptionsInput] = useState('');

  // Drag and drop index state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const deletedFields = fields.filter((f) => !!f.deletedAt);
  const sortedFields = fields.filter((f) => !f.deletedAt).sort((a, b) => a.order - b.order);

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedFields.length) return;

    const newSorted = [...sortedFields];
    const temp = newSorted[index];
    newSorted[index] = newSorted[targetIndex];
    newSorted[targetIndex] = temp;

    // Re-assign order numbers
    const reordered = newSorted.map((f, i) => ({ ...f, order: i + 1 }));
    onChange([...reordered, ...deletedFields]);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const newSorted = [...sortedFields];
    const draggedItem = newSorted[draggedIndex];
    newSorted.splice(draggedIndex, 1);
    newSorted.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    const reordered = newSorted.map((f, i) => ({ ...f, order: i + 1 }));
    onChange([...reordered, ...deletedFields]);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleOpenAdd = () => {
    setIsNew(true);
    const newField: FormField = {
      id: `field_${Date.now()}`,
      name: '',
      label: '',
      type: 'text',
      placeholder: '',
      required: false,
      order: sortedFields.length + 1,
      googleSheetColumn: '',
      visible: true,
      defaultValue: '',
      dynamicValue: '',
    };
    setEditingField(newField);
    setOptionsInput('');
    setShowModal(true);
  };

  const handleOpenEdit = (field: FormField) => {
    setIsNew(false);
    setEditingField({ ...field });
    setOptionsInput((field.options || []).join('\n'));
    setShowModal(true);
  };

  const handleDeletePrompt = (field: FormField) => {
    setFieldToDelete(field);
  };

  const handleConfirmDelete = () => {
    if (!fieldToDelete) return;
    const remaining = sortedFields.filter((f) => f.id !== fieldToDelete.id).map((f, i) => ({ ...f, order: i + 1 }));
    const deleted = { ...fieldToDelete, visible: false, deletedAt: new Date().toISOString() };
    onChange([...remaining, ...deletedFields, deleted]);
    const label = fieldToDelete.label || fieldToDelete.name;
    setFieldToDelete(null);
    setToastMessage(`Đã xóa trường "${label}" thành công.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingField || !editingField.label.trim()) return;

    // Auto-generate name if empty
    let fieldName = editingField.name.trim();
    if (!fieldName) {
      fieldName = editingField.label
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
    }

    // Parse options for select/radio
    let options: string[] | undefined = undefined;
    if (['select', 'radio', 'multiselect'].includes(editingField.type)) {
      options = optionsInput
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      if (options.length === 0) {
        options = ['Lựa chọn 1', 'Lựa chọn 2', 'Lựa chọn 3'];
      }
    }

    const updatedField: FormField = {
      ...editingField,
      name: fieldName,
      options,
      googleSheetColumn: editingField.googleSheetColumn?.trim() || editingField.label,
    };

    if (isNew) {
      onChange([...sortedFields, updatedField, ...deletedFields]);
    } else {
      onChange([...sortedFields.map((f) => (f.id === updatedField.id ? updatedField : f)), ...deletedFields]);
    }

    setShowModal(false);
    setEditingField(null);
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs">
        <div>
          <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-600" />
            <span>Cấu Hình Các Trường Form Thu Thập Lead</span>
          </h3>
          <p className="text-xs text-neutral-600 mt-0.5">
            Thêm, sửa, sắp xếp thứ tự và ánh xạ các trường form vào cột Google Sheet
          </p>
        </div>

        <button
          type="button"
          id="btn-add-form-field"
          onClick={handleOpenAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Trường Mới</span>
        </button>
      </div>

      {/* Field List & Live Preview Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Fields Manager */}
        <div className="lg:col-span-8 space-y-3">
          {sortedFields.map((field, idx) => (
            <div
              key={field.id}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className={`bg-white border rounded-xl p-4 shadow-xs flex items-center justify-between gap-3 transition-all ${
                draggedIndex === idx
                  ? 'border-blue-500 bg-blue-50/50 opacity-80'
                  : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              {/* Drag Handle & Info */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="text-neutral-400 hover:text-neutral-600 cursor-grab active:cursor-grabbing p-1"
                  title="Kéo thả để sắp xếp vị trí"
                >
                  <GripVertical className="w-5 h-5" />
                </div>

                <span className="w-6 h-6 rounded-full bg-neutral-100 text-neutral-600 text-xs font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-neutral-900 truncate">
                      {field.label}
                    </span>
                    {field.required ? (
                      <span className="text-[10px] font-semibold bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                        Bắt buộc
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">
                        Tùy chọn
                      </span>
                    )}
                    <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">
                      {field.type}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-neutral-500 mt-1">
                    <span className="font-mono text-[11px] text-neutral-400">
                      key: {field.name}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-emerald-700 font-medium">
                      <Table className="w-3 h-3" />
                      Cột Sheet: {field.googleSheetColumn || field.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions: Move Up/Down, Edit, Delete */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleMove(idx, 'up')}
                  disabled={idx === 0}
                  className="p-1.5 text-neutral-500 hover:text-neutral-800 disabled:opacity-25 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                  title="Di chuyển lên"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(idx, 'down')}
                  disabled={idx === sortedFields.length - 1}
                  className="p-1.5 text-neutral-500 hover:text-neutral-800 disabled:opacity-25 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                  title="Di chuyển xuống"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => { const copy={...JSON.parse(JSON.stringify(field)),id:`field_${Date.now()}`,label:`${field.label} (Bản sao)`,name:`${field.name}_copy`,order:sortedFields.length+1,deletedAt:undefined}; onChange([...sortedFields,copy,...deletedFields]); }} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Duplicate field"><Copy className="w-4 h-4"/></button>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(field)}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer ml-1"
                  title="Chỉnh sửa trường"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeletePrompt(field)}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Xóa trường"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Right: Live Mini Form Preview */}
        <div className="lg:col-span-4 bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-xs h-fit sticky top-24">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-neutral-100 text-neutral-800 font-bold text-sm">
            <Eye className="w-4 h-4 text-blue-600" />
            <span>Xem Trước Form</span>
          </div>

          <div className="space-y-3 pointer-events-none opacity-90">
            {sortedFields.filter(field => field.visible !== false && field.type !== 'hidden').map((field) => (
              <div key={field.id} className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-700">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <div className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs text-neutral-400">
                  {field.placeholder || `Nhập ${field.label.toLowerCase()}`}
                </div>
              </div>
            ))}
            <div className="w-full bg-blue-600 text-white font-bold text-xs py-2.5 rounded-lg text-center mt-2 shadow-xs">
              Gửi Đăng Ký Ngay →
            </div>
          </div>
        </div>
      </div>

      {deletedFields.length > 0 && <div className="bg-white border border-red-100 rounded-2xl p-4 space-y-2"><div className="font-black text-sm text-red-700">Thùng rác Form Fields ({deletedFields.length})</div>{deletedFields.map(field=><div key={field.id} className="flex justify-between items-center gap-3 p-3 bg-red-50/50 rounded-xl"><div className="text-xs"><b>{field.label}</b> <span className="font-mono text-neutral-500">{field.name}</span></div><div className="flex gap-2"><button type="button" onClick={()=>onChange([...sortedFields,{...field,deletedAt:undefined,visible:true,order:sortedFields.length+1},...deletedFields.filter(x=>x.id!==field.id)])} className="p-2 text-emerald-700 bg-white rounded-lg" title="Restore"><RotateCcw className="w-4 h-4"/></button><button type="button" onClick={()=>onChange([...sortedFields,...deletedFields.filter(x=>x.id!==field.id)])} className="p-2 text-red-600 bg-white rounded-lg" title="Permanent delete"><Trash2 className="w-4 h-4"/></button></div></div>)}</div>}

      {/* Edit / Add Field Modal */}
      {showModal && editingField && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-start sm:items-center justify-center p-4 z-50 overflow-y-auto cms-admin-modal-scroll">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 max-h-[calc(100vh-2rem)] overflow-y-auto cms-admin-modal-scroll animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-neutral-900 mb-4">
              {isNew ? 'Thêm Trường Form Mới' : `Chỉnh Sửa Trường: ${editingField.label}`}
            </h3>

            <form onSubmit={handleSaveModal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Nhãn Hiển Thị (Khách hàng thấy trên form) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Ngân sách dự kiến"
                  value={editingField.label}
                  onChange={(e) =>
                    setEditingField({ ...editingField, label: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Loại Trường Dữ Liệu
                  </label>
                  <select
                    value={editingField.type}
                    onChange={(e) =>
                      setEditingField({
                        ...editingField,
                        type: e.target.value as FieldType,
                      })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-600"
                  >
                    <option value="text">Văn bản (Text)</option>
                    <option value="email">Email</option>
                    <option value="tel">Số điện thoại (Tel)</option>
                    <option value="number">Số (Number)</option>
                    <option value="select">Menu thả xuống (Dropdown Select)</option>
                    <option value="radio">Nút chọn một (Radio Buttons)</option>
                    <option value="checkbox">Checkbox</option>
                    <option value="multiselect">Chọn nhiều (Multi Select)</option>
                    <option value="textarea">Đoạn văn bản (Textarea)</option>
                    <option value="hidden">Hidden Field</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Mã Trường (Field Key / Name)
                  </label>
                  <input
                    type="text"
                    placeholder="VD: budgetRange"
                    value={editingField.name}
                    onChange={(e) =>
                      setEditingField({ ...editingField, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-sm font-mono text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Văn Bản Gợi Ý (Placeholder)
                </label>
                <input
                  type="text"
                  placeholder="VD: Chọn mức ngân sách phù hợp"
                  value={editingField.placeholder}
                  onChange={(e) =>
                    setEditingField({ ...editingField, placeholder: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Options for Select and Radio */}
              {['select', 'radio', 'multiselect'].includes(editingField.type) && (
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Danh Sách Lựa Chọn (Mỗi dòng một lựa chọn)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Lựa chọn 1&#10;Lựa chọn 2&#10;Lựa chọn 3"
                    value={optionsInput}
                    onChange={(e) => setOptionsInput(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:border-blue-600"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="block text-xs font-bold text-neutral-700 mb-1">Default Value</label><input className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs" value={editingField.defaultValue || ''} onChange={e=>setEditingField({...editingField,defaultValue:e.target.value})} placeholder="Giá trị mặc định" /></div><div><label className="block text-xs font-bold text-neutral-700 mb-1">Dynamic Value</label><input className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs font-mono" value={editingField.dynamicValue || ''} onChange={e=>setEditingField({...editingField,dynamicValue:e.target.value})} placeholder="{{product_name}} hoặc {{utm_source}}" /></div></div>

              <div className="bg-violet-50/60 border border-violet-200 rounded-xl p-3 space-y-3">
                <div><div className="text-xs font-black text-violet-900">Validation</div><p className="text-[11px] text-violet-700">Thiết lập kiểm tra dữ liệu bằng field an toàn; không cần JavaScript.</p></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="block text-xs font-bold text-neutral-700 mb-1">Min Length</label><input type="number" min="0" className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs" value={editingField.minLength ?? ''} onChange={e=>setEditingField({...editingField,minLength:e.target.value===''?undefined:Number(e.target.value)})}/></div>
                  <div><label className="block text-xs font-bold text-neutral-700 mb-1">Max Length</label><input type="number" min="0" className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs" value={editingField.maxLength ?? ''} onChange={e=>setEditingField({...editingField,maxLength:e.target.value===''?undefined:Number(e.target.value)})}/></div>
                </div>
                <div><label className="block text-xs font-bold text-neutral-700 mb-1">Validation Pattern (Regex)</label><input className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs font-mono" value={editingField.validationPattern || ''} onChange={e=>setEditingField({...editingField,validationPattern:e.target.value})} placeholder="VD: ^0[0-9]{9}$"/></div>
                <div><label className="block text-xs font-bold text-neutral-700 mb-1">Validation Message</label><input className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs" value={editingField.validationMessage || ''} onChange={e=>setEditingField({...editingField,validationMessage:e.target.value})} placeholder="Thông báo hiển thị khi dữ liệu không hợp lệ"/></div>
              </div>

              {/* Google Sheets Column Mapping */}
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3">
                <label className="block text-xs font-bold text-emerald-900 mb-1 flex items-center gap-1.5">
                  <Table className="w-3.5 h-3.5 text-emerald-700" />
                  Tiêu Đề Cột Trong Google Sheet
                </label>
                <input
                  type="text"
                  placeholder="VD: Ngân Sách Dự Kiến"
                  value={editingField.googleSheetColumn || ''}
                  onChange={(e) =>
                    setEditingField({ ...editingField, googleSheetColumn: e.target.value })
                  }
                  className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-sm text-neutral-900 focus:outline-none focus:border-emerald-600"
                />
                <p className="text-[11px] text-emerald-700 mt-1">
                  Tên cột chính xác ở Hàng 1 trên Google Sheet của bạn cho trường dữ liệu này.
                </p>
              </div>

              {/* Required Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  id="field-required-toggle"
                  type="checkbox"
                  checked={editingField.required}
                  onChange={(e) =>
                    setEditingField({ ...editingField, required: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 rounded border-neutral-300 focus:ring-blue-500"
                />
                <label
                  htmlFor="field-required-toggle"
                  className="text-xs font-bold text-neutral-800 cursor-pointer"
                >
                  Đặt làm trường bắt buộc điền (Required)
                </label>
              </div>

              <div className="flex items-center gap-2"><input id="field-visible-toggle" type="checkbox" checked={editingField.visible !== false} onChange={e=>setEditingField({...editingField,visible:e.target.checked})} className="w-4 h-4"/><label htmlFor="field-visible-toggle" className="text-xs font-bold">Visible (bỏ chọn để dùng như field ẩn theo cấu hình)</label></div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-neutral-200">
                {!isNew ? (
                  <button
                    type="button"
                    onClick={() => {
                      const fieldRef = editingField;
                      setShowModal(false);
                      setFieldToDelete(fieldRef);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 hover:text-red-800 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa Trường Này</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-5 rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Lưu Trường Form
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-App Confirmation Modal For Deleting Field */}
      {fieldToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-4 z-50 overflow-y-auto cms-admin-modal-scroll animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 max-h-[calc(100vh-2rem)] overflow-y-auto cms-admin-modal-scroll">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-4 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <h4 className="text-base font-bold text-neutral-900 text-center mb-2">
              Xác Nhận Xóa Trường Form?
            </h4>

            <p className="text-xs text-neutral-600 text-center leading-relaxed mb-6">
              Bạn có chắc chắn muốn xóa trường <strong className="text-neutral-900 font-bold">"{fieldToDelete.label}"</strong> (mã: <span className="font-mono bg-neutral-100 px-1 py-0.5 rounded">{fieldToDelete.name}</span>)? Trường này sẽ không còn xuất hiện trên biểu mẫu đăng ký của khách hàng.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setFieldToDelete(null)}
                className="flex-1 py-2.5 px-4 text-xs font-bold text-neutral-700 hover:bg-neutral-100 rounded-xl border border-neutral-200 transition-colors cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Xóa Trường Form
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 text-white text-xs font-medium px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-3">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
