/**
 * Utility functions for contract rendering and PDF generation
 */

/**
 * Format currency for display
 */
export const formatCurrency = (value) => {
  return Number(value || 0).toLocaleString('vi-VN') + ' VNĐ';
};

/**
 * Format date for display
 */
export const formatDate = (date) => {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Convert number to Vietnamese words
 */
export const numberToWords = (number) => {
  if (number === 0) return 'không';
  if (number < 0) return 'âm ' + numberToWords(Math.abs(number));

  const units = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const places = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

  let words = '';
  let tempNumber = Math.floor(number);

  const readThreeDigits = (num, showHundreds) => {
    let res = '';
    let hundreds = Math.floor(num / 100);
    let tens = Math.floor((num % 100) / 10);
    let ones = num % 10;

    if (hundreds > 0 || showHundreds) {
      res += units[hundreds] + ' trăm ';
    }

    if (tens > 1) {
      res += units[tens] + ' mươi ';
      if (ones === 1) res += 'mốt';
      else if (ones === 5) res += 'lăm';
      else if (ones > 0) res += units[ones];
    } else if (tens === 1) {
      res += 'mười ';
      if (ones === 5) res += 'lăm';
      else if (ones > 0) res += units[ones];
    } else if (ones > 0) {
      if (hundreds >= 0 && tens === 0 && showHundreds) res += 'linh ' + units[ones];
      else res += units[ones];
    }
    return res;
  };

  let chunks = [];
  while (tempNumber > 0) {
    chunks.push(tempNumber % 1000);
    tempNumber = Math.floor(tempNumber / 1000);
  }

  for (let i = chunks.length - 1; i >= 0; i--) {
    if (chunks[i] > 0) {
      words += readThreeDigits(chunks[i], i < chunks.length - 1) + ' ' + places[i] + ' ';
    } else if (i === 0 && words === '') {
      words += 'không';
    }
  }

  const result = words.trim().replace(/\s+/g, ' ');
  return result.charAt(0).toUpperCase() + result.slice(1);
};

/**
 * Generate HTML contract content from form data and terms
 */
export const generateContractHTML = (contractData) => {
  const {
    contractCode,
    formData,
    terms,
    customerSignature,
    supplierSignature,
    paymentInfo,
  } = contractData;

  const totalAmount = (formData.totalFare || 0) - (formData.appliedDiscount || 0) + (formData.lateFeeAmount || 0);
  const totalAmountInWords = numberToWords(totalAmount);

  return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Hợp đồng ${contractCode}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Times+New+Roman&display=swap');
        
        body {
          font-family: 'Times New Roman', Times, serif;
          line-height: 1.5;
          color: #000;
          background: white;
          padding: 1.5cm;
          max-width: 210mm; /* A4 width */
          margin: 0 auto;
          font-size: 14pt;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .uppercase { text-transform: uppercase; }
        
        .cgh {
          margin-bottom: 20px;
        }
        .cgh p { margin: 0; }
        
        .title {
          margin: 30px 0;
        }
        .title h1 {
          font-size: 18pt;
          margin: 0;
        }
        
        .section {
          margin-bottom: 15px;
          text-align: justify;
        }
        
        .field-row {
          display: flex;
          margin-bottom: 5px;
        }
        .field-label {
          flex-shrink: 0;
          padding-right: 5px;
        }
        .field-value {
          flex-grow: 1;
          border-bottom: 1px dotted #000;
          min-height: 1.2em;
        }
        
        .two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        
        .footer-signature {
          margin-top: 40px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          text-align: center;
        }
        
        .signature-box {
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 10px 0;
        }
        
        .signature-image {
          max-height: 100px;
          max-width: 200px;
        }
        
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="cgh text-center">
        <p class="font-bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
        <p class="font-bold">Độc lập – Tự do – Hạnh phúc</p>
        <p>---------------</p>
      </div>

      <div class="title text-center">
        <h1 class="font-bold uppercase">HỢP ĐỒNG CHO THUÊ XE Ô TÔ TỰ LÁI</h1>
        <p>Mã số: ${contractCode}</p>
      </div>

      <div class="section">
        <p class="font-bold italic">Căn cứ:</p>
        <ul style="list-style-type: none; padding-left: 20px;">
          <li>- Bộ luật Dân sự 2015 (số 91/2015/QH13) về hợp đồng thuê tài sản.</li>
          <li>- Luật Giao thông đường bộ 2024 về trách nhiệm người điều khiển phương tiện.</li>
          <li>- Các quy định pháp luật khác có liên quan.</li>
        </ul>
      </div>

      <div class="section">
        <p class="font-bold">Điều 1. Đối tượng hợp đồng</p>
        <p>Bên A (Bên cho thuê) đồng ý cho Bên B (Bên thuê) thuê 01 (một) xe ô tô tự lái như sau:</p>
        <div class="field-row">
          <span class="field-label">Biển số xe:</span>
          <span class="field-value">${formData.licensePlate || '...........................'}</span>
        </div>
        <div class="field-row">
          <span class="field-label">Nhãn hiệu / Model:</span>
          <span class="field-value">${formData.carBrand || ''} ${formData.carModel || '...........................'}</span>
        </div>
        <div class="field-row">
          <span class="field-label">Màu sắc:</span>
          <span class="field-value">${formData.carColor || '.............................'}</span>
        </div>
        <div class="field-row">
          <span class="field-label">Số khung / số máy:</span>
          <span class="field-value">.................................................</span>
        </div>
        <div class="field-row">
          <span class="field-label">Năm sản xuất:</span>
          <span class="field-value">${formData.carYear || '.......................'}</span>
        </div>
      </div>

      <div class="section">
        <p class="font-bold">Điều 2. Thời hạn thuê</p>
        <div class="field-row">
          <span class="field-label">Thời gian thuê:</span>
          <span class="field-value">Từ ${formatDate(formData.startDate)} đến ${formatDate(formData.endDate)} (${formData.totalDays} ngày)</span>
        </div>
        <div class="field-row">
          <span class="field-label">Địa điểm nhận xe:</span>
          <span class="field-value">${formData.pickupLocation || '.........................................'}</span>
        </div>
        <div class="field-row">
          <span class="field-label">Địa điểm trả xe:</span>
          <span class="field-value">${formData.dropoffLocation || '.........................................'}</span>
        </div>
      </div>

      <div class="section">
        <p class="font-bold">Điều 3. Giá thuê và phương thức thanh toán</p>
        <div class="field-row">
          <span class="field-label">Giá thuê:</span>
          <span class="field-value">${formatCurrency(totalAmount)}</span>
        </div>
        <div class="field-row">
          <span class="field-label">(Bằng chữ:</span>
          <span class="field-value">${totalAmountInWords} đồng)</span>
        </div>
        <div class="field-row">
          <span class="field-label">Phương thức thanh toán:</span>
          <span class="field-value">${paymentInfo?.paymentMethod?.toUpperCase() || formData.paymentMethod || 'Chuyển khoản / Thẻ ngân hàng'}</span>
        </div>
        <p>Bên B xác nhận thanh toán đầy đủ khi ký hợp đồng hoặc theo thỏa thuận sau: ${paymentInfo?.paymentStatus === 'completed' ? 'Đã thanh toán thành công' : '................'}</p>
      </div>

      <div class="section">
        <p class="font-bold">Điều 4. Đặt cọc và bảo hiểm</p>
        <div class="field-row">
          <span class="field-label">Số tiền đặt cọc:</span>
          <span class="field-value">${formatCurrency(formData.depositAmount)}</span>
        </div>
        <p>Bên cho thuê cam kết xe có giấy đăng ký, giấy kiểm định và bảo hiểm trách nhiệm dân sự còn hiệu lực theo Luật Giao thông đường bộ 2024.</p>
        <p>Bên thuê chịu trách nhiệm bồi thường nếu vi phạm giao thông, gây hư hỏng xe hoặc sử dụng xe sai mục đích.</p>
      </div>

      <div class="section">
        <p class="font-bold">Điều 5. Trách nhiệm của các bên</p>
        <p><span class="font-bold">Bên A:</span> Giao xe đúng tình trạng, cung cấp giấy tờ liên quan, bảo dưỡng xe theo định kỳ.</p>
        <p><span class="font-bold">Bên B:</span> Kiểm tra xe, giấy tờ trước khi nhận; sử dụng xe an toàn, đúng pháp luật; không được chở khách thu tiền.</p>
      </div>

      <div class="section">
        <p class="font-bold">Điều 6. Xử lý vi phạm và tranh chấp</p>
        <p>Trường hợp vi phạm, các bên ưu tiên thương lượng, nếu không thỏa thuận được sẽ giải quyết theo pháp luật Việt Nam. Hợp đồng này có giá trị pháp lý kể từ khi hai bên ký và thực hiện thanh toán.</p>
      </div>

      <div class="section">
        <p class="font-bold">Điều 7. Ký và lệ phí điện tử</p>
        <p>Hợp đồng được lập thành 02 bản, mỗi bên giữ 01 bản. Hai bên đồng ý sử dụng chữ ký điện tử (digital signature) để xác nhận hợp đồng và thanh toán.</p>
      </div>

      <div class="footer-signature">
        <div>
          <p class="font-bold">BÊN A (Bên cho thuê)</p>
          <div class="signature-box">
             ${supplierSignature ? `<img src="${supplierSignature}" class="signature-image" alt="Chữ ký Bên A">` : '................................'}
          </div>
          <p>Họ tên: ${formData.supplierName || '....................'}</p>
          <p>CCCD: ${formData.supplierNationalId || '....................'}</p>
          <p>Địa chỉ: ${formData.supplierAddress || '....................'}</p>
          <p>SĐT: ${formData.supplierPhone || '....................'}</p>
        </div>
        <div>
          <p class="font-bold">BÊN B (Bên thuê)</p>
          <div class="signature-box">
             ${customerSignature ? `<img src="${customerSignature}" class="signature-image" alt="Chữ ký Bên B">` : '................................'}
          </div>
          <p>Họ tên: ${formData.customerName || '....................'}</p>
          <p>CCCD: ${formData.customerNationalId || '....................'}</p>
          <p>Địa chỉ: ${formData.customerAddress || '....................'}</p>
          <p>SĐT: ${formData.customerPhone || '....................'}</p>
        </div>
      </div>

      <div class="text-center" style="margin-top: 30px; font-size: 10pt; color: #555;">
        <p><i>Ký ngày: ${formatDate(new Date())}</i></p>
        <p>Hợp đồng này được ký điện tử và có giá trị pháp lý theo quy định của pháp luật hiện hành.</p>
      </div>
    </body>
    </html>
  `;
};


/**
 * Convert HTML to PDF using html2pdf library
 */
export const generatePDF = async (contractData, filename = 'contract.pdf') => {
  try {
    const html = generateContractHTML(contractData);
    const element = document.createElement('div');
    element.innerHTML = html;

    // Try using html2pdf if available
    if (window.html2pdf) {
      window.html2pdf().set({
        margin: 10,
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
      }).from(element).save();
    } else {
      // Fallback: just print the HTML
      const newWindow = window.open('', '_blank');
      newWindow.document.write(html);
      newWindow.document.close();
      newWindow.print();
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Không thể tạo PDF hợp đồng');
  }
};

/**
 * Download HTML as text file
 */
export const downloadHTML = (contractData, filename = 'contract.html') => {
  const html = generateContractHTML(contractData);
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/html;charset=utf-8,' + encodeURIComponent(html));
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

export default {
  formatCurrency,
  formatDate,
  numberToWords,
  generateContractHTML,
  generatePDF,
  downloadHTML
};
