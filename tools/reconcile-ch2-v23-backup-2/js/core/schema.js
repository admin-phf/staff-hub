(function(global){
  'use strict';
  const PHF=global.PHFReconcile=global.PHFReconcile||{};

  const BUILD=Object.freeze({
    version:'2.4.0',
    name:'Integrity Engine',
    date:'2026-09-22'
  });

  // Exact 43-column workbook contract taken from the approved desired workbook.
  // Do not reorder or rename without intentionally changing the output contract version.
  const COLUMNS=Object.freeze([
    {key:'INDEX',header:'INDEX',width:8,type:'index'},
    {key:'Order Date',header:'Order Date',width:13,type:'text'},
    {key:'Invoice Date',header:'Invoice Date',width:13,type:'text'},
    {key:'Invoice Number',header:'Invoice Number',width:15,type:'text'},
    {key:'Your Ref',header:'Your Ref',width:22,type:'text'},
    {key:'Line Count',header:'Line Count',width:12,type:'text'},
    {key:'Tax Amount',header:'Tax Amount',width:13,type:'money'},
    {key:'Invoice Total',header:'Invoice Total',width:13,type:'money'},
    {key:'POS SUPPLIER',header:'POS SUPPLIER',width:28,type:'text'},
    {key:'MATCH STATUS',header:'MATCH STATUS',width:22,type:'text'},
    {key:'MATCH METHOD',header:'MATCH METHOD',width:34,type:'text'},
    {key:'MATCH CONFIDENCE',header:'MATCH CONFIDENCE',width:16,type:'text'},
    {key:'FUZZY SCORE',header:'FUZZY SCORE',width:11,type:'number1'},
    {key:'POS MASTER BARCODE',header:'POS MASTER BARCODE',width:18,type:'text'},
    {key:'POS PLU',header:'POS PLU',width:12,type:'text'},
    {key:'POS BRAND',header:'POS BRAND',width:18,type:'text'},
    {key:'POS DESCR',header:'POS DESCR',width:40,type:'text'},
    {key:'CH2 SUPPLIER SKU',header:'CH2 SUPPLIER SKU',width:24,type:'text'},
    {key:'CH2 PRODUCT CODE',header:'CH2 PRODUCT CODE',width:15,type:'text'},
    {key:'CH2 QTY SUPPLIED',header:'CH2 QTY SUPPLIED',width:14,type:'qty'},
    {key:'CH2 DISC %',header:'CH2 DISC %',width:11,type:'pct'},
    {key:'CH2 GST',header:'CH2 GST',width:9,type:'pct'},
    {key:'POS GST TAX PC',header:'POS GST TAX PC',width:13,type:'pct'},
    {key:'POS WSP EXCGST',header:'POS WSP EXCGST',width:16,type:'money'},
    {key:'CH2 NORMAL W/S',header:'CH2 NORMAL W/S',width:14,type:'money'},
    {key:'POS LAST PRICE',header:'POS LAST PRICE',width:15,type:'money'},
    {key:'CH2 UNIT PRICE EX GST',header:'CH2 UNIT PRICE EX GST',width:18,type:'money'},
    {key:'POS RRP INCGST',header:'POS RRP INCGST',width:16,type:'money'},
    {key:'CH2 RRP',header:'CH2 RRP',width:12,type:'money'},
    {key:'POS TOTAL',header:'POS TOTAL',width:14,type:'money'},
    {key:'CH2 TOTAL',header:'CH2 TOTAL',width:12,type:'money'},
    {key:'POS CH2 WHOLESALE EX GST',header:'POS CH2 WHOLESALE EX GST',width:22,type:'money'},
    {key:'CH2 WHOLESALE VARIANCE',header:'CH2 WHOLESALE VARIANCE',width:18,type:'money'},
    {key:'CH2 WHOLESALE CHECK',header:'CH2 WHOLESALE CHECK',width:24,type:'text'},
    {key:'DIS EXPECTED %',header:'DIS EXPECTED %',width:14,type:'pct'},
    {key:'DIS MATCH TYPE',header:'DIS MATCH TYPE',width:22,type:'text'},
    {key:'DIS MATCH KEY',header:'DIS MATCH KEY',width:30,type:'text'},
    {key:'DIS MATCH RULE',header:'DIS MATCH RULE',width:42,type:'text'},
    {key:'DIS CH2 DISC CHECK',header:'DIS CH2 DISC CHECK',width:24,type:'text'},
    {key:'DIS EXPECTED UNIT EXGST',header:'DIS EXPECTED UNIT EXGST',width:20,type:'money'},
    {key:'DIS UNIT VARIANCE',header:'DIS UNIT VARIANCE',width:16,type:'money'},
    {key:'DIS UNIT CHECK',header:'DIS UNIT CHECK',width:22,type:'text'},
    {key:'DIS MISSED TOTAL',header:'DIS MISSED TOTAL',width:16,type:'money'}
  ]);

  const HEADERS=Object.freeze(COLUMNS.map(c=>c.header));
  const TOTAL_HEADERS=new Set([
    'Tax Amount','Invoice Total','CH2 QTY SUPPLIED','POS WSP EXCGST','CH2 NORMAL W/S',
    'POS LAST PRICE','CH2 UNIT PRICE EX GST','POS RRP INCGST','CH2 RRP','POS TOTAL',
    'CH2 TOTAL','POS CH2 WHOLESALE EX GST','CH2 WHOLESALE VARIANCE',
    'DIS EXPECTED UNIT EXGST','DIS UNIT VARIANCE','DIS MISSED TOTAL'
  ]);

  const VISUAL=Object.freeze({
    fontName:'Google Sans', fontSize:8,
    summaryFill:'#1E3A5F', summaryFont:'#E6CD74',
    headerFill:'#DDE6ED', text:'#1F2937', border:'#D9E2F3',
    oddFill:'#FFFFFF', evenFill:'#F3F6F9',
    goodFill:'#E6F4EA', goodText:'#0F9D58',
    badFill:'#FCE8E6', badText:'#D93025',
    infoFill:'#E8F0FE', infoText:'#1967D2',
    mutedText:'#9AA0A6',
    row1Height:25.5, row2Height:42, dataHeight:18, totalsHeight:25.5
  });

  PHF.schema={BUILD,COLUMNS,HEADERS,TOTAL_HEADERS,VISUAL};
})(window);
