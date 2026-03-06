import React, { useState } from 'react';
import { whiteLabelService, WhiteLabel } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Upload, Palette, Image, Type, CheckCircle2, Eye, Building2, Trash2, Plus } from 'lucide-react';

const WhiteLabeling: React.FC = () => {
  const toast = useToast();
  const [whiteLabels, setWhiteLabels] = useState<WhiteLabel[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [logo, setLogo] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  React.useEffect(() => {
    whiteLabelService.list()
      .then((items) => {
        setWhiteLabels(items);
        if (items.length > 0) {
          setSelectedId(items[0].id);
          setName(items[0].name);
          setTitle(items[0].title);
          setLogo(items[0].logo_url || '');
        }
      })
      .catch(() => {
        setWhiteLabels([]);
      });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const selectWhiteLabel = (wl: WhiteLabel) => {
    setSelectedId(wl.id);
    setName(wl.name);
    setTitle(wl.title);
    setLogo(wl.logo_url || '');
    setLogoFile(null);
    setSaved(false);
  };

  const startNew = () => {
    setSelectedId(null);
    setName('');
    setTitle('');
    setLogo('');
    setLogoFile(null);
    setSaved(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('White-label name is required.');
      return;
    }
    if (!title.trim()) {
      toast.error('Dashboard title is required.');
      return;
    }
    setLoading(true);
    setSaved(false);
    try {
      if (selectedId) {
        const updated = await whiteLabelService.update(selectedId, {
          name: name.trim(),
          title: title.trim(),
          logo: logoFile,
        });
        setWhiteLabels((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
        selectWhiteLabel(updated);
      } else {
        const created = await whiteLabelService.create({
          name: name.trim(),
          title: title.trim(),
          logo: logoFile,
        });
        setWhiteLabels((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        selectWhiteLabel(created);
      }
      setSaved(true);
      toast.success('White-label saved. Assign it to an Admin during user creation.');
      setTimeout(() => setSaved(false), 3000);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save branding';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      await whiteLabelService.remove(selectedId);
      const remaining = whiteLabels.filter((x) => x.id !== selectedId);
      setWhiteLabels(remaining);
      if (remaining.length > 0) {
        selectWhiteLabel(remaining[0]);
      } else {
        startNew();
      }
      toast.success('White-label deleted.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete white-label';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">White-Labeling Settings</h1>
            <p className="text-slate-600">
              Customize company logo and system title for enterprise branding
            </p>
          </div>
          <div className="p-3 bg-purple-100 rounded-lg">
            <Palette className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* White-label list */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              <span>Company White-Labels</span>
            </span>
            <Button variant="outline" onClick={startNew} className="border-slate-300">
              <Plus className="h-4 w-4 mr-2" />
              New
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {whiteLabels.length === 0 ? (
            <p className="text-sm text-slate-600">No white-label configurations yet. Create one using “New”.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {whiteLabels.map((wl) => (
                <button
                  key={wl.id}
                  type="button"
                  onClick={() => selectWhiteLabel(wl)}
                  className={`text-left rounded-lg border p-4 transition-colors ${
                    wl.id === selectedId ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
                      {wl.logo_url ? (
                        <img src={wl.logo_url} alt="Logo" className="h-10 w-10 object-contain" />
                      ) : (
                        <Palette className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{wl.name}</p>
                      <p className="text-xs text-slate-600 truncate">{wl.title}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Branding Configuration */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
          <CardTitle className="flex items-center space-x-2">
            <Palette className="h-5 w-5 text-purple-600" />
            <span>{selectedId ? 'Edit White-Label' : 'Create White-Label'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-2">
              <Building2 className="h-4 w-4 inline mr-1" />
              Company Name *
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Power Ltd"
              className="h-11"
              required
            />
            <p className="text-xs text-slate-500 mt-2">
              Used to identify this configuration in Admin creation.
            </p>
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-semibold text-slate-700 mb-2">
              <Type className="h-4 w-4 inline mr-1" />
              Dashboard Title *
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="IoT Monitoring System"
              className="h-11"
              required
            />
            <p className="text-xs text-slate-500 mt-2">
              This title will appear for the assigned admin and their users.
            </p>
          </div>

          <div>
            <label htmlFor="logo" className="block text-sm font-semibold text-slate-700 mb-2">
              <Image className="h-4 w-4 inline mr-1" />
              Company Logo
            </label>
            <div className="flex items-start space-x-6">
              {logo && (
                <div className="border-2 border-slate-200 rounded-xl p-4 bg-white shadow-sm">
                  <img src={logo} alt="Logo preview" className="h-24 w-auto max-w-xs" />
                </div>
              )}
              <div className="flex-1">
                <input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="logo" className="cursor-pointer">
                  <div className="inline-flex items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50 px-6 py-4 transition-colors">
                    <Upload className="h-5 w-5 mr-2 text-slate-600" />
                    <span className="font-medium text-slate-700">
                      {logoFile ? 'Change Logo' : 'Upload Logo'}
                    </span>
                  </div>
                </label>
                <p className="text-xs text-slate-500 mt-3">
                  Upload a company logo (PNG, JPG, SVG recommended). Max size: 2MB
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-4 border-t">
            <Button 
              onClick={handleSave} 
              disabled={loading || !title || !name}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
            >
              {loading ? 'Saving...' : 'Save Branding'}
            </Button>
            {selectedId && (
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={loading}
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
            {saved && (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">Branding saved successfully!</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview Section */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
          <CardTitle className="flex items-center space-x-2">
            <Eye className="h-5 w-5 text-blue-600" />
            <span>Live Preview</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center space-x-4">
              {logo ? (
                <img src={logo} alt="Logo" className="h-12 w-auto" />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Palette className="h-6 w-6 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {title || 'System Title'}
                </h1>
                <p className="text-sm text-slate-400">Energy Monitor</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4 text-center">
            This preview shows how branding will appear for the assigned company users
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhiteLabeling;
