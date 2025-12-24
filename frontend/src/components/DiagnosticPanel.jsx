import { useState, useEffect } from 'react';
import { getAttendance } from '../services/api';
import { format } from 'date-fns';

export default function DiagnosticPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const today = format(new Date(), 'yyyy-MM-dd');
        const response = await getAttendance(today, today);
        
        console.log('API Response:', response);
        console.log('Response data:', response.data);
        
        setData({
          raw: response,
          data: response.data,
          firstRecord: response.data && response.data[0] ? response.data[0] : null
        });
      } catch (err) {
        console.error('Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{color: 'red'}}>Error: {error}</div>;

  const record = data?.firstRecord;

  return (
    <div style={{padding: '20px', fontFamily: 'monospace', backgroundColor: '#f0f0f0'}}>
      <h2>Attendance Data Diagnostic</h2>
      
      {!record && <div style={{color: 'red', fontWeight: 'bold'}}>❌ NO ATTENDANCE RECORD FOUND</div>}
      
      {record && (
        <div style={{backgroundColor: 'white', padding: '15px', borderRadius: '5px', marginTop: '10px'}}>
          <h3 style={{color: 'green'}}>✅ Attendance Record Found</h3>
          
          <table style={{width: '100%', borderCollapse: 'collapse'}}>
            <tbody>
              <tr style={{borderBottom: '1px solid #ccc'}}>
                <td style={{padding: '8px', fontWeight: 'bold'}}>ID:</td>
                <td style={{padding: '8px'}}>{record.id}</td>
              </tr>
              <tr style={{borderBottom: '1px solid #ccc'}}>
                <td style={{padding: '8px', fontWeight: 'bold'}}>Employee ID:</td>
                <td style={{padding: '8px'}}>{record.employee_id}</td>
              </tr>
              <tr style={{borderBottom: '1px solid #ccc'}}>
                <td style={{padding: '8px', fontWeight: 'bold'}}>Date:</td>
                <td style={{padding: '8px'}}>{record.date}</td>
              </tr>
              <tr style={{borderBottom: '1px solid #ccc', backgroundColor: record.in_time ? '#90EE90' : '#FFB6C1'}}>
                <td style={{padding: '8px', fontWeight: 'bold'}}>in_time:</td>
                <td style={{padding: '8px'}}>{record.in_time || 'NULL'}</td>
              </tr>
              <tr style={{borderBottom: '1px solid #ccc', backgroundColor: record.out_time ? '#90EE90' : '#FFB6C1'}}>
                <td style={{padding: '8px', fontWeight: 'bold'}}>out_time:</td>
                <td style={{padding: '8px'}}>{record.out_time || 'NULL'}</td>
              </tr>
              <tr style={{borderBottom: '1px solid #ccc'}}>
                <td style={{padding: '8px', fontWeight: 'bold'}}>status:</td>
                <td style={{padding: '8px'}}>{record.status}</td>
              </tr>
              <tr style={{borderBottom: '1px solid #ccc'}}>
                <td style={{padding: '8px', fontWeight: 'bold'}}>worked_hours:</td>
                <td style={{padding: '8px'}}>{record.worked_hours}</td>
              </tr>
            </tbody>
          </table>

          <div style={{marginTop: '20px', padding: '10px', backgroundColor: '#e8f5e9', borderRadius: '5px'}}>
            <strong>Frontend Logic:</strong>
            <p>todayStatus.in_time exists: <strong style={{color: 'green'}}>{record.in_time ? '✅ TRUE' : '❌ FALSE'}</strong></p>
            <p>Should show "Check Out" button: <strong style={{color: 'green'}}>{record.in_time && !record.out_time ? '✅ YES' : '❌ NO'}</strong></p>
          </div>

          <details style={{marginTop: '20px'}}>
            <summary style={{cursor: 'pointer', fontWeight: 'bold'}}>Full JSON Response</summary>
            <pre style={{backgroundColor: '#fff', padding: '10px', overflowX: 'auto', marginTop: '10px'}}>
              {JSON.stringify(data.data, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
