import React, { useState } from 'react';
import { brandingService } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Upload, Palette, Image, Type, CheckCircle2, Eye } from 'lucide-react';

const WhiteLabeling: React.FC = () => {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [logo, setLogo] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  React.useEffect(() => {
    brandingService.getBranding()
      .then(branding => {
        setTitle(branding.title);
        setLogo(branding.logo);
      })
      .catch(() => {
        setTitle('IoT Energy Monitoring System');
        setLogo('');
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

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('System title is required.');
      return;
    }
    setLoading(true);
    setSaved(false);
    try {
      const updated = await brandingService.updateBranding({
        title: title.trim(),
        logo: logoFile || undefined,
      });
      setTitle(updated.title);
      setLogo(updated.logo);
      setLogoFile(null);
      setSaved(true);
      toast.success('Branding saved. Logo and title will appear in the sidebar and login page.');
      setTimeout(() => setSaved(false), 3000);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save branding';
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

      {/* Branding Configuration */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
          <CardTitle className="flex items-center space-x-2">
            <Palette className="h-5 w-5 text-purple-600" />
            <span>Branding Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-semibold text-slate-700 mb-2">
              <Type className="h-4 w-4 inline mr-1" />
              System Title *
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="IoT Energy Monitoring System"
              className="h-11"
              required
            />
            <p className="text-xs text-slate-500 mt-2">
              This title will appear across the entire application in headers and navigation
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
              disabled={loading || !title}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
            >
              {loading ? 'Saving...' : 'Save Branding'}
            </Button>
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
            This preview shows how your branding will appear in the application header
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhiteLabeling;
