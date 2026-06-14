import { useState } from 'react';
import axios from 'axios';
import { Upload, AlertTriangle, Check, X } from 'lucide-react';

export default function Import() {
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('http://localhost:5000/api/expenses/import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setPreviewData(res.data);
    } catch (err) {
      console.error(err);
      alert('Failed to upload and parse file.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await axios.post('http://localhost:5000/api/expenses/import/confirm', {
        resolvedData: previewData.processed,
        anomalies: previewData.anomalies
      });
      setImportSuccess(true);
      setPreviewData(null);
      setFile(null);
    } catch (err) {
      console.error(err);
      alert('Failed to import data.');
    } finally {
      setLoading(false);
    }
  };

  const toggleApproval = (index) => {
    const newData = { ...previewData };
    newData.anomalies[index].isApproved = !newData.anomalies[index].isApproved;
    // For simplicity, we just toggle it. In a real app, rejecting an anomaly might revert the processed data
    // Here we assume "approving" applies the resolution.
    setPreviewData(newData);
  };

  return (
    <div className="animate-fade-in">
      <h1>Import Expenses</h1>

      {importSuccess && (
        <div className="card mb-4 bg-green-900/20 border-green-500/30">
          <h3 className="text-success flex items-center gap-2"><Check /> Import Successful!</h3>
          <p className="text-muted mt-2">Your expenses have been successfully imported and balances updated.</p>
        </div>
      )}

      {!previewData && (
        <div className="card max-w-lg">
          <p className="mb-4 text-muted">Upload your CSV file exported from the old spreadsheet to migrate to FairSplit.</p>
          <div className="flex gap-4">
            <input type="file" accept=".csv" onChange={handleFileChange} />
            <button onClick={handleUpload} disabled={!file || loading} className="flex items-center gap-2">
              <Upload size={18} /> {loading ? 'Processing...' : 'Upload & Preview'}
            </button>
          </div>
        </div>
      )}

      {previewData && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2>Review Anomalies ({previewData.anomalies.length})</h2>
            <div className="flex gap-4">
              <button className="secondary" onClick={() => setPreviewData(null)}>Cancel</button>
              <button onClick={handleConfirm} disabled={loading} className="flex items-center gap-2">
                <Check size={18} /> Confirm Import
              </button>
            </div>
          </div>

          <p className="mb-4 text-muted">
            We found some issues in the data. We've applied smart resolutions. Please review any items flagged for your attention.
          </p>

          <div className="card mb-4 overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Issue Type</th>
                  <th>Resolution</th>
                  <th>Original Data Snippet</th>
                  <th>Approve?</th>
                </tr>
              </thead>
              <tbody>
                {previewData.anomalies.map((anom, idx) => {
                  const orig = JSON.parse(anom.originalRowData);
                  const snippet = `${orig.date} | ${orig.description} | ${orig.amount}`;
                  
                  return (
                    <tr key={idx}>
                      <td>
                        <span className={`badge ${anom.isApproved ? 'primary' : 'danger'} flex items-center gap-1 w-max`}>
                          <AlertTriangle size={12} /> {anom.issueType}
                        </span>
                      </td>
                      <td>{anom.resolution}</td>
                      <td className="text-muted font-mono text-sm">{snippet}</td>
                      <td>
                        <button 
                          className={anom.isApproved ? 'secondary' : 'danger'} 
                          onClick={() => toggleApproval(idx)}
                          title={anom.isApproved ? "Approved - Click to reject" : "Needs Review - Click to approve"}
                        >
                          {anom.isApproved ? <Check size={16} /> : <X size={16} />}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <h2>Preview Valid Expenses ({previewData.processed.length})</h2>
          <div className="card overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Currency</th>
                  <th>Split Type</th>
                </tr>
              </thead>
              <tbody>
                {previewData.processed.slice(0, 10).map((exp, idx) => (
                  <tr key={idx}>
                    <td>{exp.date}</td>
                    <td>{exp.description}</td>
                    <td>{exp.amount}</td>
                    <td>{exp.currency}</td>
                    <td><span className="badge">{exp.split_type}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {previewData.processed.length > 10 && (
              <p className="text-center text-muted mt-4 text-sm">Showing 10 of {previewData.processed.length} expenses...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
