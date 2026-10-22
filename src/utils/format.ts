// Định dạng tiền tệ VNĐ (vd: 1.500.000đ)
export function formatVND(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '0đ';
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

// Định dạng ngày giờ dd/MM/yyyy HH:mm
export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '--';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// Map trạng thái đơn hàng sang tiếng Việt và màu sắc
export function getOrderStatusBadge(status: string): { label: string; bg: string; text: string } {
  switch (status) {
    case 'pending':
      return { label: 'Chờ xác nhận', bg: 'bg-[#F5EEDC]', text: 'text-[#8A6D3B]' };
    case 'confirmed':
      return { label: 'Chờ lấy hàng', bg: 'bg-[#EBF3F5]', text: 'text-[#3E7B88]' };
    case 'shipping':
      return { label: 'Đang giao', bg: 'bg-[#E8F0FE]', text: 'text-[#1967D2]' };
    case 'delivered':
      return { label: 'Đã giao', bg: 'bg-[#EBF5EE]', text: 'text-[#337A47]' };
    case 'completed':
      return { label: 'Hoàn thành', bg: 'bg-[#EAF4EB]', text: 'text-[#2E7D32]' };
    case 'cancelled':
      return { label: 'Đã hủy', bg: 'bg-[#FBEAEB]', text: 'text-[#C53929]' };
    default:
      return { label: status, bg: 'bg-stone-100', text: 'text-stone-700' };
  }
}

// Map trạng thái thanh toán
export function getPaymentStatusBadge(status: string): { label: string; bg: string; text: string } {
  switch (status) {
    case 'paid':
      return { label: 'Đã thanh toán', bg: 'bg-[#EBF5EE]', text: 'text-[#337A47]' };
    case 'unpaid':
      return { label: 'Chưa thanh toán (COD)', bg: 'bg-[#F5EEDC]', text: 'text-[#8A6D3B]' };
    case 'refunded':
      return { label: 'Đã hoàn tiền (mô phỏng)', bg: 'bg-[#F2EDEA]', text: 'text-[#8C5E47]' };
    default:
      return { label: status, bg: 'bg-stone-100', text: 'text-stone-700' };
  }
}

// Thuật toán Luhn kiểm tra số thẻ hợp lệ
export function validateLuhn(cardNumber: string): boolean {
  const cleanNumber = cardNumber.replace(/\D/g, '');
  if (cleanNumber.length < 13 || cleanNumber.length > 19) return false;

  let sum = 0;
  let isEven = false;

  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber.charAt(i), 10);
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}
