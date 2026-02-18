import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/Dialog';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Download, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface DownloadReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceId: string;
  deviceName: string;
  parameterMapping: Record<string, string>;
  onDownload: (from: Date, to: Date) => Promise<void>;
}

const DownloadReportDialog: React.FC<DownloadReportDialogProps> = ({
  open,
  onOpenChange,
  deviceId,
  deviceName,
  parameterMapping,
  onDownload
}) => {
  const [fromDate, setFromDate] = useState(format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [fromTime, setFromTime] = useState('00:00');
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [toTime, setToTime] = useState('23:59');
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    try {
      setLoading(true);
      
      // Combine date and time into Date objects
      const fromDateTime = new Date(`${fromDate}T${fromTime}:00`);
      const toDateTime = new Date(`${toDate}T${toTime}:59`);
      
      // Validate dates
      if (fromDateTime > toDateTime) {
        alert('From date/time must be before To date/time');
        setLoading(false);
        return;
      }
      
      await onDownload(fromDateTime, toDateTime);
      onOpenChange(false);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader onClose={() => onOpenChange(false)}>
          <DialogTitle className="text-lg font-semibold text-slate-900 flex items-center">
            <Download className="h-5 w-5 mr-2 text-blue-600" />
            Download Device Report
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-900">Device: {deviceName}</p>
            <p className="text-xs text-blue-700 mt-1">Device ID: {deviceId}</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
                <Calendar className="h-4 w-4 mr-1 text-slate-500" />
                From Date & Time
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="text-sm"
                />
                <Input
                  type="time"
                  value={fromTime}
                  onChange={(e) => setFromTime(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
                <Clock className="h-4 w-4 mr-1 text-slate-500" />
                To Date & Time
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="text-sm"
                />
                <Input
                  type="time"
                  value={toTime}
                  onChange={(e) => setToTime(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <p className="text-xs text-slate-600 mb-1">
              <strong>Report Period:</strong>
            </p>
            <p className="text-xs text-slate-700">
              {(() => {
                try {
                  return format(new Date(`${fromDate}T${fromTime}:00`), 'PPpp');
                } catch {
                  return `${fromDate} ${fromTime}`;
                }
              })()} to{' '}
              {(() => {
                try {
                  return format(new Date(`${toDate}T${toTime}:59`), 'PPpp');
                } catch {
                  return `${toDate} ${toTime}`;
                }
              })()}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Report will include all available parameters for this device.
            </p>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDownload}
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <Download className="h-4 w-4 mr-2" />
              {loading ? 'Generating...' : 'Download CSV Report'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DownloadReportDialog;
