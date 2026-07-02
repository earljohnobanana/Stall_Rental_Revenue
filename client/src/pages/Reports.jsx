import { useState, useEffect, useCallback, useRef } from 'react';
import { MdAssessment, MdDownload, MdRefresh, MdNightlight,
         MdStorefront, MdFilterList, MdClose, MdSearch, MdPerson } from 'react-icons/md';
import api from '../services/api';

const fmt = (n) => Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });
const MONTHS = ['','January','February','March','April','May','June',
                'July','August','September','October','November','December'];
const ALL_YEARS = () => {
  const yr = new Date().getFullYear();
  return Array.from({ length: 10 }, (_, i) => yr - i);
};

export default function Reports() {
  const currentYear = new Date().getFullYear();

  const [section, setSection]                     = useState('stalls');
  // Multi-year: array of selected years, empty = all years
  const [selectedYears, setSelectedYears]         = useState([currentYear]);
  const [showYearPicker, setShowYearPicker]        = useState(false);
  const [month, setMonth]                         = useState('');
  const [buildingFilter, setBuildingFilter]       = useState('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('');
  // Owner name search
  const [ownerSearch, setOwnerSearch]             = useState('');
  const [ownerInput, setOwnerInput]               = useState('');
  const [loading, setLoading]                     = useState(false);
  const [exporting, setExporting]                 = useState(false);
  const [stallData, setStallData]                 = useState([]);
  const [nmData, setNmData]                       = useState([]);
  const [nmSummary, setNmSummary]                 = useState(null);
  const [buildings, setBuildings]                 = useState([]);
  const [fetchError, setFetchError]               = useState('');
  const yearPickerRef = useRef(null);

  useEffect(() => {
    api.get('/buildings').then(r => setBuildings(r.data || [])).catch(() => {});
  }, []);

  // Close year picker on outside click
  useEffect(() => {
    const handler = (e) => {
      if (yearPickerRef.current && !yearPickerRef.current.contains(e.target)) {
        setShowYearPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleYear = (yr) => {
    setSelectedYears(prev => {
      if (prev.includes(yr)) {
        // Don't allow deselecting all
        if (prev.length === 1) return prev;
        return prev.filter(y => y !== yr);
      }
      return [...prev, yr].sort((a, b) => b - a);
    });
  };

  const selectAllYears = () => setSelectedYears([]);
  const clearAllYears  = () => setSelectedYears([currentYear]);

  const yearLabel = selectedYears.length === 0
    ? 'All Years'
    : selectedYears.length === 1
    ? `Year ${selectedYears[0]}`
    : selectedYears.sort((a,b)=>a-b).join(', ');

  const fetchStallReport = useCallback(async () => {
    setLoading(true); setFetchError('');
    try {
      const params = new URLSearchParams();
      // Multi-year: send comma-separated or nothing for all
      if (selectedYears.length > 0) params.append('years', selectedYears.join(','));
      if (month)             params.append('month', month);
      if (buildingFilter)    params.append('building_id', buildingFilter);
      if (paymentTypeFilter) params.append('payment_type', paymentTypeFilter);
      if (ownerSearch)       params.append('owner_name', ownerSearch);
      params.append('_t', Date.now());
      const res = await api.get(`/reports?${params}`);
      setStallData(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setFetchError('Failed to load: ' + (err.response?.data?.message || err.message));
      setStallData([]);
    } finally { setLoading(false); }
  }, [selectedYears, month, buildingFilter, paymentTypeFilter, ownerSearch]);

  const fetchNmReport = useCallback(async () => {
    setLoading(true); setFetchError('');
    try {
      const params = new URLSearchParams();
      if (selectedYears.length > 0) params.append('years', selectedYears.join(','));
      if (month) params.append('month', month);
      params.append('_t', Date.now());
      const res = await api.get(`/night-market/report?${params}`);
      setNmData(Array.isArray(res.data?.payments) ? res.data.payments : []);
      setNmSummary(res.data?.summary || null);
    } catch (err) {
      setFetchError('Failed to load: ' + (err.response?.data?.message || err.message));
      setNmData([]);
    } finally { setLoading(false); }
  }, [selectedYears, month]);

  useEffect(() => {
    if (section === 'stalls') fetchStallReport();
    else fetchNmReport();
  }, [section, fetchStallReport, fetchNmReport]);

  const data = section === 'stalls' ? stallData : nmData;

  const periodLabel = selectedYears.length === 0
    ? 'All Years'
    : selectedYears.length === 1
    ? (month ? `${MONTHS[Number(month)]} ${selectedYears[0]}` : `Year ${selectedYears[0]}`)
    : selectedYears.sort((a,b)=>a-b).join(' & ');

  const stallSummary = {
    count:    stallData.length,
    rental:   stallData.reduce((s, r) => s + Number(r.rental_fee   || 0), 0),
    electric: stallData.reduce((s, r) => s + Number(r.electric_fee || 0), 0),
    total:    stallData.reduce((s, r) => s + Number(r.total_amount || 0), 0),
  };

  const exportExcel = async () => {
    if (data.length === 0) return;
    setExporting(true);
    try {
      const EJS      = await import('exceljs');
      const Workbook = EJS.Workbook || EJS.default?.Workbook;
      const wb       = new Workbook();
      const isStalls = section === 'stalls';
      const ws       = wb.addWorksheet(isStalls ? 'Stall Payments' : 'Night Market');

      // Page setup — Long bond paper landscape
      ws.pageSetup = {
        paperSize: 5, orientation: 'landscape',
        fitToPage: true, fitToWidth: 1, fitToHeight: 0,
        margins: { left:0.5, right:0.5, top:0.75, bottom:0.75, header:0.3, footer:0.3 },
      };
      ws.headerFooter = { oddFooter: '&CPage &P of &N' };

      const periodStr = selectedYears.length === 0
        ? (month ? `${MONTHS[Number(month)]} — All Years` : 'All Years')
        : selectedYears.length === 1
        ? (month ? `${MONTHS[Number(month)]} ${selectedYears[0]}` : `Year ${selectedYears[0]}`)
        : selectedYears.sort((a,b)=>a-b).join(' & ');

      // Styles
      const NAVY    = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF1B2A4A' } };
      const ALT     = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFF5F3EC' } };
      const ALTNM   = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFFFF8E8' } };
      const BLDG_HDR= { type:'pattern', pattern:'solid', fgColor:{ argb:'FFE8EDF5' } };
      const GOLD    = { bold:true, color:{ argb:'FFFFD700' }, size:11, name:'Calibri' };
      const WHT     = { bold:true, color:{ argb:'FFFFFFFF' }, size:11, name:'Calibri' };
      const BASE    = { size:10, name:'Calibri' };
      const NUM     = '#,##0.00';
      const BDR     = { top:{style:'hair'}, bottom:{style:'hair'}, left:{style:'hair'}, right:{style:'hair'} };
      const HDR_BDR = { top:{style:'medium',color:{argb:'FF1B2A4A'}}, bottom:{style:'medium',color:{argb:'FF1B2A4A'}}, left:{style:'medium',color:{argb:'FF1B2A4A'}}, right:{style:'medium',color:{argb:'FF1B2A4A'}} };

      if (isStalls) {
        // ── Determine columns based on payment type filter ──
        // If electric only → show Amount (Electric) column, no Rental column
        // If rental only   → show Amount (Rental) column, no Electric column
        // If all types     → show both columns
        const showRental   = paymentTypeFilter !== 'electric';
        const showElectric = paymentTypeFilter !== 'rental' && paymentTypeFilter !== 'security_deposit';
        const showBoth     = showRental && showElectric;

        // Dynamic column setup
        // Base cols: # | OR Number | Date | Owner Name | Stall No. | Building
        // Amount cols: depends on filter
        // Last col: Remarks
        let colWidths, headers;
        if (paymentTypeFilter === 'electric') {
          // Electric only: # | OR No. | Date | Owner | Stall | Building | Amount (₱) | Remarks
          colWidths = [5, 16, 14, 28, 13, 16, 14, 46];
          headers   = ['#','OR Number','Date','Owner Name','Stall No.','Building','Amount (₱)','Remarks'];
        } else if (paymentTypeFilter === 'rental' || paymentTypeFilter === 'security_deposit') {
          // Rental/SecDep only: # | OR No. | Date | Owner | Stall | Building | Amount (₱) | Remarks
          colWidths = [5, 16, 14, 28, 13, 16, 14, 46];
          headers   = ['#','OR Number','Date','Owner Name','Stall No.','Building','Amount (₱)','Remarks'];
        } else {
          // All types: # | OR No. | Date | Owner | Stall | Building | Rental | Electric | Total | Remarks
          colWidths = [5, 16, 14, 28, 13, 16, 14, 14, 14, 46];
          headers   = ['#','OR Number','Date','Owner Name','Stall No.','Building','Rental (₱)','Electric (₱)','Total (₱)','Remarks'];
        }
        const totalCols = colWidths.length;
        const lastColLetter = ['A','B','C','D','E','F','G','H','I','J','K'][totalCols - 1];

        colWidths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

        // Title rows
        for (let i = 1; i <= 4; i++) ws.addRow(Array(totalCols).fill(''));

        const filterLabel = paymentTypeFilter === 'electric' ? ' — ELECTRIC FEE'
          : paymentTypeFilter === 'rental' ? ' — RENTAL'
          : paymentTypeFilter === 'security_deposit' ? ' — SECURITY DEPOSIT'
          : '';

        ws.mergeCells(`A1:${lastColLetter}1`);
        ws.getCell('A1').value     = "MUNICIPAL TREASURER'S OFFICE";
        ws.getCell('A1').font      = { bold:true, size:14, name:'Calibri' };
        ws.getCell('A1').alignment = { horizontal:'left', vertical:'middle', indent:1 };
        ws.getRow(1).height = 24;

        ws.mergeCells(`A2:${lastColLetter}2`);
        ws.getCell('A2').value     = `STALL RENTAL PAYMENT REPORT${filterLabel} — ${periodStr}`;
        ws.getCell('A2').font      = { bold:true, size:12, name:'Calibri' };
        ws.getCell('A2').alignment = { horizontal:'left', vertical:'middle', indent:1 };
        ws.getRow(2).height = 20;

        ws.mergeCells(`A3:${lastColLetter}3`);
        ws.getCell('A3').value     = `Generated: ${new Date().toLocaleDateString('en-PH',{month:'long',day:'numeric',year:'numeric'})}  |  Total Records: ${stallData.length}`;
        ws.getCell('A3').font      = { italic:true, size:10, name:'Calibri', color:{argb:'FF555555'} };
        ws.getCell('A3').alignment = { horizontal:'left', vertical:'middle', indent:1 };
        ws.getRow(3).height = 15;
        ws.getRow(4).height = 6;

        // Headers
        const hRow = ws.addRow(headers);
        hRow.height = 22;
        const numColStart = paymentTypeFilter ? 7 : 7; // amount cols start at col 7
        hRow.eachCell({ includeEmpty:true }, (cell, col) => {
          cell.fill      = NAVY;
          cell.font      = WHT;
          cell.border    = HDR_BDR;
          cell.alignment = col >= 7
            ? { horizontal:'right',  vertical:'middle' }
            : col === 1
            ? { horizontal:'center', vertical:'middle' }
            : { horizontal:'left',   vertical:'middle' };
        });

        // ── Sort: by building → stall number → payment date ──
        const sorted = [...stallData].sort((a, b) => {
          const bldgA = (a.building_name || '').toLowerCase();
          const bldgB = (b.building_name || '').toLowerCase();
          if (bldgA < bldgB) return -1;
          if (bldgA > bldgB) return 1;
          // Same building — sort by stall number
          const stallA = (a.stall_number || '').toLowerCase();
          const stallB = (b.stall_number || '').toLowerCase();
          if (stallA < stallB) return -1;
          if (stallA > stallB) return 1;
          // Same stall — sort by date ascending
          return new Date(a.payment_date) - new Date(b.payment_date);
        });

        // Group by building for subtotals
        const buildings = [...new Set(sorted.map(r => r.building_name || 'Unknown'))];
        let rowNum = 0;
        let grandTotal = 0;

        buildings.forEach(bldg => {
          const bldgRows = sorted.filter(r => (r.building_name || 'Unknown') === bldg);
          const bldgTotal = bldgRows.reduce((s, r) => s + Number(r.total_amount || 0), 0);
          grandTotal += bldgTotal;

          // Building header row
          const bldgHeader = ws.addRow([`  ${bldg.toUpperCase()}`, ...Array(totalCols - 1).fill('')]);
          bldgHeader.height = 18;
          bldgHeader.eachCell({ includeEmpty:true }, cell => {
            cell.fill      = BLDG_HDR;
            cell.font      = { ...BASE, bold:true, color:{argb:'FF1B2A4A'} };
            cell.border    = BDR;
            cell.alignment = { horizontal:'left', vertical:'middle' };
          });
          ws.mergeCells(`A${bldgHeader.number}:${lastColLetter}${bldgHeader.number}`);

          // Data rows for this building
          bldgRows.forEach((r, i) => {
            rowNum++;
            const isAlt  = i % 2 === 1;
            const amount = Number(r.total_amount || 0);
            const rental = Number(r.rental_fee   || 0);
            const elec   = Number(r.electric_fee || 0);
            const dateStr = r.payment_date
              ? new Date(r.payment_date).toLocaleDateString('en-PH',{month:'short',day:'2-digit',year:'numeric'})
              : '';

            let rowData;
            if (paymentTypeFilter === 'electric' || paymentTypeFilter === 'rental' || paymentTypeFilter === 'security_deposit') {
              // Single amount column
              rowData = [rowNum, r.or_number||'', dateStr, r.owner_name||'', r.stall_number||'', r.building_name||'', amount, r.remarks||''];
            } else {
              // Both rental and electric + total
              rowData = [rowNum, r.or_number||'', dateStr, r.owner_name||'', r.stall_number||'', r.building_name||'', rental, elec, amount, r.remarks||''];
            }

            const dRow = ws.addRow(rowData);
            dRow.height = 17;
            dRow.eachCell({ includeEmpty:true }, (cell, col) => {
              if (isAlt) cell.fill = ALT;
              cell.border = BDR;
              switch (col) {
                case 1:  cell.font={...BASE,color:{argb:'FF888888'}}; cell.alignment={horizontal:'center',vertical:'middle'}; break;
                case 2:  cell.font={...BASE,bold:true,color:{argb:'FF8B0000'}}; cell.alignment={horizontal:'left',vertical:'middle'}; break;
                case 3:  cell.font={...BASE}; cell.alignment={horizontal:'center',vertical:'middle'}; break;
                case 4:  cell.font={...BASE,bold:true}; cell.alignment={horizontal:'left',vertical:'middle'}; break;
                case 5:  cell.font={...BASE,bold:true,color:{argb:'FF1B3A8A'}}; cell.alignment={horizontal:'left',vertical:'middle'}; break;
                case 6:  cell.font={...BASE,color:{argb:'FF555555'}}; cell.alignment={horizontal:'left',vertical:'middle'}; break;
                case 7:  // Amount or Rental
                  cell.numFmt=NUM;
                  cell.font = paymentTypeFilter==='electric'
                    ? {size:10,name:'Calibri',color:{argb:'FFB45309'}}
                    : {size:10,name:'Calibri'};
                  cell.alignment={horizontal:'right',vertical:'middle'}; break;
                case 8:  // Electric or Remarks
                  if (!paymentTypeFilter || paymentTypeFilter==='') {
                    cell.numFmt=NUM; cell.font={...BASE,color:elec>0?{argb:'FFB45309'}:{argb:'FF222222'}}; cell.alignment={horizontal:'right',vertical:'middle'};
                  } else {
                    cell.font={...BASE,italic:true,color:{argb:'FF444444'}}; cell.alignment={horizontal:'left',vertical:'middle',wrapText:false};
                  }
                  break;
                case 9:  // Total (all types only)
                  cell.numFmt=NUM; cell.font={...BASE,bold:true,color:{argb:'FF166534'}}; cell.alignment={horizontal:'right',vertical:'middle'}; break;
                case 10: // Remarks (all types only)
                  cell.font={...BASE,italic:true,color:{argb:'FF444444'}}; cell.alignment={horizontal:'left',vertical:'middle',wrapText:false}; break;
              }
            });
          });

          // Building subtotal row
          const subTot = ws.addRow([
            '', '', '', '', '',
            `  Subtotal — ${bldg} (${bldgRows.length} records):`,
            ...(paymentTypeFilter ? [bldgTotal] : [
              bldgRows.reduce((s,r)=>s+Number(r.rental_fee||0),0),
              bldgRows.reduce((s,r)=>s+Number(r.electric_fee||0),0),
              bldgTotal,
            ]),
            '',
          ]);
          subTot.height = 16;
          subTot.eachCell({ includeEmpty:true }, (cell, col) => {
            cell.fill   = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFD8E0F0' } };
            cell.font   = { ...BASE, bold:true, color:{ argb:'FF1B2A4A' } };
            cell.border = BDR;
            if (col === 6) cell.alignment = { horizontal:'right', vertical:'middle' };
            else if (col >= 7 && col <= (paymentTypeFilter ? 7 : 9)) {
              cell.numFmt    = NUM;
              cell.alignment = { horizontal:'right', vertical:'middle' };
            } else {
              cell.alignment = { horizontal:'left', vertical:'middle' };
            }
          });

          // Blank spacer between buildings
          ws.addRow(Array(totalCols).fill('')).height = 4;
        });

        // Grand total row
        const grandRental  = sorted.reduce((s,r)=>s+Number(r.rental_fee||0),0);
        const grandElectric= sorted.reduce((s,r)=>s+Number(r.electric_fee||0),0);
        const tot = ws.addRow([
          '', '', '', '', '',
          'GRAND TOTAL:',
          ...(paymentTypeFilter ? [grandTotal] : [grandRental, grandElectric, grandTotal]),
          `${stallData.length} record${stallData.length!==1?'s':''}`,
        ]);
        tot.height = 22;
        tot.eachCell({ includeEmpty:true }, (cell, col) => {
          cell.fill   = NAVY;
          cell.font   = GOLD;
          cell.border = HDR_BDR;
          if (col === 6) { cell.alignment={horizontal:'right',vertical:'middle'}; }
          else if (col >= 7 && col <= (paymentTypeFilter ? 7 : 9)) { cell.numFmt=NUM; cell.alignment={horizontal:'right',vertical:'middle'}; }
          else { cell.alignment={horizontal:'left',vertical:'middle'}; }
        });

      } else {
        // ── NIGHT MARKET (unchanged) ──────────────────────
        ws.getColumn(1).width=5; ws.getColumn(2).width=16; ws.getColumn(3).width=14;
        ws.getColumn(4).width=13; ws.getColumn(5).width=26; ws.getColumn(6).width=15;
        ws.getColumn(7).width=14; ws.getColumn(8).width=13; ws.getColumn(9).width=13;
        ws.getColumn(10).width=14; ws.getColumn(11).width=46;

        for (let i=1;i<=4;i++) ws.addRow(Array(11).fill(''));
        ws.mergeCells('A1:K1'); ws.getCell('A1').value="MUNICIPAL TREASURER'S OFFICE"; ws.getCell('A1').font={bold:true,size:14,name:'Calibri'}; ws.getCell('A1').alignment={horizontal:'left',vertical:'middle',indent:1}; ws.getRow(1).height=24;
        ws.mergeCells('A2:K2'); ws.getCell('A2').value=`NIGHT MARKET PAYMENT REPORT — ${periodStr}`; ws.getCell('A2').font={bold:true,size:12,name:'Calibri'}; ws.getCell('A2').alignment={horizontal:'left',vertical:'middle',indent:1}; ws.getRow(2).height=20;
        ws.mergeCells('A3:K3'); ws.getCell('A3').value=`Generated: ${new Date().toLocaleDateString('en-PH',{month:'long',day:'numeric',year:'numeric'})}  |  Total Records: ${nmData.length}`; ws.getCell('A3').font={italic:true,size:10,name:'Calibri',color:{argb:'FF555555'}}; ws.getCell('A3').alignment={horizontal:'left',vertical:'middle',indent:1}; ws.getRow(3).height=15; ws.getRow(4).height=6;

        const hRow=ws.addRow(['#','OR Number','Date','Stall No.','Owner Name','Daily Rental (₱)','Electric (₱)','Balance (₱)','Interest (₱)','Total (₱)','Remarks']);
        hRow.height=22;
        hRow.eachCell({includeEmpty:true},(cell,col)=>{ cell.fill=NAVY; cell.font=WHT; cell.border=HDR_BDR; cell.alignment=col>=6?{horizontal:'right',vertical:'middle'}:col===1?{horizontal:'center',vertical:'middle'}:{horizontal:'left',vertical:'middle'}; });

        const sortedNm=[...nmData].sort((a,b)=>{
          const sA=(a.stall_number||'').toLowerCase(), sB=(b.stall_number||'').toLowerCase();
          if(sA<sB)return -1; if(sA>sB)return 1;
          return new Date(a.payment_date)-new Date(b.payment_date);
        });

        sortedNm.forEach((r,i)=>{
          const isAlt=i%2===1; const elec=Number(r.electric_fee||0);
          const dRow=ws.addRow([i+1,r.or_number||'',r.payment_date?new Date(r.payment_date).toLocaleDateString('en-PH',{month:'short',day:'2-digit',year:'numeric'}):'',r.stall_number||'',r.owner_name||'',Number(r.rental_fee||0),elec,Number(r.balance||0),Number(r.interest||0),Number(r.total_amount||0),r.remarks||'']);
          dRow.height=17;
          dRow.eachCell({includeEmpty:true},(cell,col)=>{
            if(isAlt)cell.fill=ALTNM; cell.border=BDR;
            if(col===1){cell.font={...BASE,color:{argb:'FF888888'}};cell.alignment={horizontal:'center',vertical:'middle'};}
            else if(col===2){cell.font={...BASE,bold:true,color:{argb:'FF8B0000'}};cell.alignment={horizontal:'left',vertical:'middle'};}
            else if(col===3){cell.font={...BASE};cell.alignment={horizontal:'center',vertical:'middle'};}
            else if(col===4){cell.font={...BASE,bold:true,color:{argb:'FF1B3A8A'}};cell.alignment={horizontal:'left',vertical:'middle'};}
            else if(col===5){cell.font={...BASE,bold:true};cell.alignment={horizontal:'left',vertical:'middle'};}
            else if(col>=6&&col<=10){cell.numFmt=NUM;cell.font=col===7&&elec>0?{...BASE,color:{argb:'FFB45309'}}:{...BASE};cell.alignment={horizontal:'right',vertical:'middle'};}
            else{cell.font={...BASE,italic:true,color:{argb:'FF444444'}};cell.alignment={horizontal:'left',vertical:'middle',wrapText:false};}
          });
        });

        ws.addRow(Array(11).fill('')).height=6;
        const sm=nmSummary||{};
        const tot=ws.addRow(['','','','','GRAND TOTAL:',sm.totalRental||0,sm.totalElectric||0,'','',sm.totalCollected||0,`${nmData.length} records`]);
        tot.height=22;
        tot.eachCell({includeEmpty:true},(cell,col)=>{ cell.fill=NAVY;cell.font=GOLD;cell.border=HDR_BDR; if(col===5){cell.alignment={horizontal:'right',vertical:'middle'};}else if([6,7,10].includes(col)){cell.numFmt=NUM;cell.alignment={horizontal:'right',vertical:'middle'};}else{cell.alignment={horizontal:'left',vertical:'middle'};}});
      }

      const yearsLabel = selectedYears.length === 0 ? 'AllYears' : selectedYears.sort((a,b)=>a-b).join('-');
      const fname=`${isStalls?'StallReport':'NightMarket'}_${yearsLabel}${month?'_'+String(month).padStart(2,'0'):''}${paymentTypeFilter?'_'+paymentTypeFilter:''}${ownerSearch?'_'+ownerSearch.replace(/\s+/g,'_'):''}.xlsx`;
      const buf=await wb.xlsx.writeBuffer();
      const blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url; a.download=fname; a.click();
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Export error:', err);
      alert('Export failed: ' + err.message);
    } finally { setExporting(false); }
  };



  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="page-title flex items-center gap-2"><MdAssessment/> Reports & Ledgers</h2>
          <p className="text-gov-gray font-mono text-xs mt-1">{periodLabel} · {data.length} records</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => section==='stalls' ? fetchStallReport() : fetchNmReport()}
            disabled={loading}
            className="gov-btn-secondary flex items-center gap-2 text-sm">
            <MdRefresh className={loading?'animate-spin':''}/> Refresh
          </button>
          <button onClick={exportExcel} disabled={exporting||data.length===0}
            className={`gov-btn-primary flex items-center gap-2 text-sm ${data.length===0?'opacity-50 cursor-not-allowed':''}`}>
            <MdDownload/> {exporting?'Exporting...':'Export Excel'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setSection('stalls')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-serif font-bold text-sm transition-all ${
            section==='stalls'?'bg-gov-navy text-white':'bg-white border border-gov-border text-gov-gray hover:bg-gov-cream'}`}>
          <MdStorefront/> Regular Stalls
        </button>
        <button onClick={() => setSection('nightmarket')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-serif font-bold text-sm transition-all ${
            section==='nightmarket'?'bg-gov-navy text-white':'bg-white border border-gov-border text-gov-gray hover:bg-gov-cream'}`}>
          <MdNightlight className={section==='nightmarket'?'text-gov-gold':''}/> Night Market
        </button>
      </div>

      {/* Filters */}
      <div className="gov-card p-4 rounded-lg space-y-3">
        <div className="flex flex-wrap gap-3 items-start">
          <MdFilterList className="text-gov-gray mt-2 flex-shrink-0"/>

          {/* ── Year picker ── */}
          <div className="relative" ref={yearPickerRef}>
            <button
              onClick={() => setShowYearPicker(v => !v)}
              className={`gov-input text-left flex items-center justify-between gap-2 min-w-[140px] ${showYearPicker?'border-gov-blue':''}`}>
              <span className="font-mono text-xs truncate">{yearLabel}</span>
              <span className="text-gov-gray text-xs">▾</span>
            </button>

            {showYearPicker && (
              <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-gov-border rounded-lg shadow-xl p-3 min-w-[200px]">
                <div className="flex justify-between items-center mb-2">
                  <p className="font-serif font-bold text-gov-navy text-xs">Select Year(s)</p>
                  <div className="flex gap-1">
                    <button onClick={selectAllYears} className="text-xs text-gov-blue hover:underline font-mono">All</button>
                    <span className="text-gov-gray text-xs">|</span>
                    <button onClick={clearAllYears} className="text-xs text-gov-gray hover:underline font-mono">Reset</button>
                  </div>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  <label className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gov-cream ${selectedYears.length===0?'bg-blue-50':''}`}>
                    <input type="checkbox" checked={selectedYears.length===0} onChange={selectAllYears} className="w-3.5 h-3.5"/>
                    <span className="font-mono text-xs font-bold text-gov-blue">All Years</span>
                  </label>
                  {ALL_YEARS().map(yr => (
                    <label key={yr} className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gov-cream ${selectedYears.includes(yr)?'bg-blue-50':''}`}>
                      <input type="checkbox" checked={selectedYears.includes(yr)} onChange={() => toggleYear(yr)} className="w-3.5 h-3.5"/>
                      <span className="font-mono text-xs">{yr}</span>
                      {yr === currentYear && <span className="text-xs text-green-600 font-mono">(current)</span>}
                    </label>
                  ))}
                </div>
                {selectedYears.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gov-border">
                    <p className="font-mono text-xs text-gov-gray">Selected: {selectedYears.sort((a,b)=>a-b).join(', ')}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Month */}
          <select value={month} onChange={e=>setMonth(e.target.value)} className="gov-input w-36">
            <option value="">All Months</option>
            {MONTHS.slice(1).map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
          </select>

          {section==='stalls' && <>
            {/* Building */}
            <select value={buildingFilter} onChange={e=>setBuildingFilter(e.target.value)} className="gov-input w-40">
              <option value="">All Buildings</option>
              {buildings.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
            </select>

            {/* Payment type */}
            <select value={paymentTypeFilter} onChange={e=>setPaymentTypeFilter(e.target.value)} className="gov-input w-36">
              <option value="">All Types</option>
              <option value="rental">Rental Only</option>
              <option value="electric">Electric Only</option>
              <option value="security_deposit">Security Deposit</option>
            </select>
          </>}

          {(month||buildingFilter||paymentTypeFilter||ownerSearch) && (
            <button onClick={()=>{setMonth('');setBuildingFilter('');setPaymentTypeFilter('');setOwnerSearch('');setOwnerInput('');}}
              className="gov-btn-secondary text-xs">Clear Filters</button>
          )}
        </div>

        {/* ── Owner name search ── */}
        {section === 'stalls' && (
          <div className="flex items-center gap-2">
            <MdPerson className="text-gov-gray flex-shrink-0"/>
            <div className="flex items-center gap-2 flex-1">
              <input
                value={ownerInput}
                onChange={e => setOwnerInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') setOwnerSearch(ownerInput.trim()); }}
                placeholder="Filter by owner name (press Enter to search)..."
                className="gov-input flex-1 text-sm"
              />
              {ownerInput && (
                <button onClick={() => { setOwnerSearch(ownerInput.trim()); }} className="gov-btn-primary text-xs flex items-center gap-1">
                  <MdSearch size={14}/> Search
                </button>
              )}
              {ownerSearch && (
                <button onClick={() => { setOwnerSearch(''); setOwnerInput(''); }} className="gov-btn-secondary text-xs flex items-center gap-1">
                  <MdClose size={14}/> Clear
                </button>
              )}
            </div>
            {ownerSearch && (
              <span className="bg-blue-100 text-gov-blue font-mono text-xs px-2 py-1 rounded-full whitespace-nowrap">
                Showing: {ownerSearch}
              </span>
            )}
          </div>
        )}
      </div>

      {fetchError && <div className="bg-red-50 border border-red-300 rounded p-3"><p className="text-red-700 text-sm">{fetchError}</p></div>}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(section==='stalls'?[
          {label:'Records',       val:stallSummary.count},
          {label:'Rental Total',  val:`₱${fmt(stallSummary.rental)}`,   color:'text-gov-blue'},
          {label:'Electric Total',val:`₱${fmt(stallSummary.electric)}`, color:'text-amber-600'},
          {label:'Grand Total',   val:`₱${fmt(stallSummary.total)}`,    color:'text-green-700', gold:true},
        ]:[
          {label:'Records',      val:nmData.length},
          {label:'Daily Rental', val:`₱${fmt(nmSummary?.totalRental)}`,   color:'text-gov-blue'},
          {label:'Electric',     val:`₱${fmt(nmSummary?.totalElectric)}`, color:'text-amber-600'},
          {label:'Grand Total',  val:`₱${fmt(nmSummary?.totalCollected)}`,color:'text-green-700',gold:true},
        ]).map(({label,val,color,gold})=>(
          <div key={label} className={`gov-card p-4 rounded-lg text-center ${gold?'border-2 border-gov-gold':'border border-gov-border'}`}>
            <p className="font-mono text-xs text-gov-gray uppercase tracking-wide">{label}</p>
            <p className={`font-serif font-bold text-lg mt-1 ${color||'text-gov-navy'}`}>{val}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="gov-card rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-10 text-center">
              <div className="w-8 h-8 border-4 border-gov-border border-t-gov-navy rounded-full animate-spin mx-auto"/>
              <p className="font-mono text-gov-gray text-sm mt-3">Loading report...</p>
            </div>
          ) : data.length===0 ? (
            <div className="p-10 text-center">
              <MdAssessment className="text-5xl text-gov-border mx-auto mb-3"/>
              <p className="font-serif font-bold text-gov-navy text-lg">No records found</p>
              <p className="font-mono text-gov-gray text-xs mt-2">No payments for {periodLabel}.</p>
              <p className="font-mono text-gov-gray text-xs">Try different filters or clear the owner search.</p>
            </div>
          ) : section==='stalls' ? (
            <table className="w-full text-xs min-w-[900px]">
              <thead>
                <tr className="bg-gov-navy text-white">
                  {['#','OR No.','Date','Owner','Stall','Building','Rental (₱)','Electric (₱)','Total (₱)','Remarks'].map(h=>(
                    <th key={h} className={`px-3 py-2.5 font-serif font-semibold whitespace-nowrap ${['Rental (₱)','Electric (₱)','Total (₱)'].includes(h)?'text-right':'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stallData.map((r,i)=>(
                  <tr key={r.id||i} className={i%2===0?'bg-white':'bg-gov-cream'}>
                    <td className="px-3 py-2 text-gov-gray font-mono text-center">{i+1}</td>
                    <td className="px-3 py-2 font-mono font-bold text-gov-red">{r.or_number}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap">{r.payment_date?new Date(r.payment_date).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}):'—'}</td>
                    <td className="px-3 py-2 font-serif font-semibold">{r.owner_name||'—'}</td>
                    <td className="px-3 py-2 font-mono text-gov-blue font-bold">{r.stall_number||'—'}</td>
                    <td className="px-3 py-2 text-gov-gray">{r.building_name||'—'}</td>
                    <td className="px-3 py-2 font-mono text-right">₱{fmt(r.rental_fee)}</td>
                    <td className={`px-3 py-2 font-mono text-right ${Number(r.electric_fee)>0?'text-amber-600':''}`}>₱{fmt(r.electric_fee)}</td>
                    <td className="px-3 py-2 font-mono text-right font-bold text-green-700">₱{fmt(r.total_amount)}</td>
                    <td className="px-3 py-2 text-gov-gray italic">{r.remarks||'—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gov-navy">
                  <td colSpan={6} className="px-3 py-2.5 font-serif text-gov-gold font-bold text-right">GRAND TOTAL ({stallData.length} records):</td>
                  <td className="px-3 py-2.5 font-mono text-right text-gov-gold font-bold">₱{fmt(stallSummary.rental)}</td>
                  <td className="px-3 py-2.5 font-mono text-right text-gov-gold font-bold">₱{fmt(stallSummary.electric)}</td>
                  <td className="px-3 py-2.5 font-mono text-right text-gov-gold font-bold">₱{fmt(stallSummary.total)}</td>
                  <td/>
                </tr>
              </tfoot>
            </table>
          ) : (
            <table className="w-full text-xs min-w-[1000px]">
              <thead>
                <tr className="bg-gov-navy text-white">
                  {['#','OR No.','Date','Stall','Owner','Daily (₱)','Electric (₱)','Balance (₱)','Interest (₱)','Total (₱)','Remarks'].map(h=>(
                    <th key={h} className={`px-3 py-2.5 font-serif font-semibold whitespace-nowrap ${['Daily (₱)','Electric (₱)','Balance (₱)','Interest (₱)','Total (₱)'].includes(h)?'text-right':'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {nmData.map((r,i)=>(
                  <tr key={r.id||i} className={i%2===0?'bg-white':'bg-amber-50/30'}>
                    <td className="px-3 py-2 text-gov-gray text-center">{i+1}</td>
                    <td className="px-3 py-2 font-mono font-bold text-gov-red">{r.or_number}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap">{r.payment_date?new Date(r.payment_date).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}):'—'}</td>
                    <td className="px-3 py-2 font-mono text-gov-blue font-bold">{r.stall_number||'—'}</td>
                    <td className="px-3 py-2 font-serif font-semibold">{r.owner_name||'—'}</td>
                    <td className="px-3 py-2 font-mono text-right">₱{fmt(r.rental_fee)}</td>
                    <td className={`px-3 py-2 font-mono text-right ${Number(r.electric_fee)>0?'text-amber-600':''}`}>₱{fmt(r.electric_fee||0)}</td>
                    <td className="px-3 py-2 font-mono text-right text-red-600">₱{fmt(r.balance||0)}</td>
                    <td className="px-3 py-2 font-mono text-right text-amber-600">₱{fmt(r.interest||0)}</td>
                    <td className="px-3 py-2 font-mono text-right font-bold text-green-700">₱{fmt(r.total_amount)}</td>
                    <td className="px-3 py-2 text-gov-gray italic">{r.remarks||'—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gov-navy">
                  <td colSpan={5} className="px-3 py-2.5 font-serif text-gov-gold font-bold text-right">GRAND TOTAL ({nmData.length} records):</td>
                  <td className="px-3 py-2.5 font-mono text-right text-gov-gold font-bold">₱{fmt(nmSummary?.totalRental)}</td>
                  <td className="px-3 py-2.5 font-mono text-right text-amber-300 font-bold">₱{fmt(nmSummary?.totalElectric)}</td>
                  <td/><td/>
                  <td className="px-3 py-2.5 font-mono text-right text-gov-gold font-bold">₱{fmt(nmSummary?.totalCollected)}</td>
                  <td/>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}