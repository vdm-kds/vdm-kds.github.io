import React from 'react';
import { X, ShieldCheck, Truck, BookOpen, HeartHandshake, PhoneCall, CheckCircle } from 'lucide-react';

export type PolicyType = 'returns' | 'shipping' | 'guide' | 'about' | 'contact';

interface PolicyModalProps {
  type: PolicyType | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PolicyModal({ type, isOpen, onClose }: PolicyModalProps) {
  if (!isOpen || !type) return null;

  const contentMap: Record<PolicyType, { title: string; subtitle: string; icon: any; content: React.ReactNode }> = {
    returns: {
      title: 'Chính Sách Đổi Trả & Hoàn Tiền',
      subtitle: 'Bảo vệ quyền lợi tối đa cho người yêu đồ second-hand tuyển chọn',
      icon: ShieldCheck,
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-[#5E5E61] leading-relaxed">
          <div className="p-3 bg-[#F5F8EF] rounded-2xl border border-[#E2E8D8] text-[#101410]">
            <p className="font-bold text-xs uppercase tracking-wide text-[#C2522D] mb-1">
              Cam kết cốt lõi của Tiệm
            </p>
            <p className="text-xs">
              Mọi món đồ tại <strong>Đồ Cũ Còn Thương</strong> đều được kiểm tra thực tế và mô tả trung thực. Khách hàng được quyền <strong>đổi trả trong vòng 3 ngày</strong> kể từ khi nhận hàng nếu sản phẩm không đúng với tình trạng cam kết.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-sm text-[#101410] mb-1.5">
              1. Điều kiện áp dụng đổi trả
            </h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Sản phẩm có vết rách, ố bẩn nặng hoặc lỗi chức năng mà <em>không được ghi trong mô tả chi tiết</em>.</li>
              <li>Độ mới thực tế chênh lệch quá 10% so với con số công bố trên thẻ kiểm định.</li>
              <li>Giao nhầm món đồ hoặc thiếu phụ kiện đính kèm như cam kết trong mô tả.</li>
              <li>Tem niêm phong bảo đảm của tiệm (nếu có trên thiết bị điện tử/máy ảnh) còn nguyên vẹn.</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-sm text-[#101410] mb-1.5">
              2. Quy trình xử lý và hoàn tiền
            </h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Khách hàng chụp ảnh/quay video chỗ lỗi và liên hệ hotline hoặc gửi tin nhắn trong vòng 72 giờ.</li>
              <li>Bưu tá của tiệm sẽ đến tận nơi nhận lại sản phẩm hoàn toàn miễn phí.</li>
              <li>Tiệm hoàn 100% số tiền qua tài khoản ngân hàng trong vòng 24 giờ sau khi nhận lại kiện hàng.</li>
            </ul>
          </div>
        </div>
      )
    },
    shipping: {
      title: 'Chính Sách Giao Hàng & Vận Chuyển',
      subtitle: 'Đồng hành cùng 4 đơn vị vận chuyển uy tín nhất Việt Nam',
      icon: Truck,
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-[#5E5E61] leading-relaxed">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono font-bold text-[#101410]">
            <div className="p-2 bg-[#F5F8EF] rounded-xl border border-[#E2E8D8]">GHN Express</div>
            <div className="p-2 bg-[#F5F8EF] rounded-xl border border-[#E2E8D8]">Viettel Post</div>
            <div className="p-2 bg-[#F5F8EF] rounded-xl border border-[#E2E8D8]">GHTK</div>
            <div className="p-2 bg-[#F5F8EF] rounded-xl border border-[#E2E8D8]">VNPost</div>
          </div>

          <div>
            <h4 className="font-bold text-sm text-[#101410] mb-1.5">
              1. Phí giao hàng & Ưu đãi
            </h4>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Đơn hàng từ 1.000.000đ trở lên:</strong> Miễn phí vận chuyển toàn quốc (Freeship).</li>
              <li><strong>Đơn hàng dưới 1.000.000đ:</strong> Cước cố định chỉ 30.000đ cho mọi tỉnh thành.</li>
              <li>Khách hàng có thể nhập thêm mã giảm giá <strong>FREESHIP</strong> tại bước thanh toán.</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-sm text-[#101410] mb-1.5">
              2. Thời gian giao hàng dự kiến
            </h4>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Nội thành TP. Hồ Chí Minh & Hà Nội:</strong> 24 – 36 giờ.</li>
              <li><strong>Các tỉnh thành khác:</strong> 2 – 4 ngày làm việc.</li>
              <li>Mỗi bước chuyển phát đều được cập nhật thời gian thực vào mục "Theo dõi đơn hàng".</li>
            </ul>
          </div>
        </div>
      )
    },
    guide: {
      title: 'Hướng Dẫn Mua Hàng & Kiểm Định',
      subtitle: 'Cách đọc thang đo độ mới và trải nghiệm mua sắm an tâm',
      icon: BookOpen,
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-[#5E5E61] leading-relaxed">
          <div>
            <h4 className="font-bold text-sm text-[#101410] mb-1.5">
              1. Thang đo độ mới (%) tại tiệm
            </h4>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-[#F5F8EF] rounded-xl border border-[#E2E8D8]">
                <strong className="text-[#08482D]">95% – 99% (Như mới / Like New):</strong> Hầu như chưa qua sử dụng hoặc chỉ mặc/thử 1–2 lần, không có khuyết tật.
              </div>
              <div className="p-2.5 bg-[#F5F8EF] rounded-xl border border-[#E2E8D8]">
                <strong className="text-[#C2522D]">85% – 90% (Rất tốt):</strong> Có dấu vết sử dụng nhẹ tự nhiên (phai màu vintage nhẹ, xước dăm), máy móc chạy hoàn hảo.
              </div>
              <div className="p-2.5 bg-[#F5F8EF] rounded-xl border border-[#E2E8D8]">
                <strong className="text-[#5E5E61]">80% (Khá):</strong> Đã qua sử dụng nhiều nhưng kết cấu chắc chắn, giá bán siêu tiết kiệm.
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-sm text-[#101410] mb-1.5">
              2. Hướng dẫn thanh toán giả lập OTP
            </h4>
            <p className="text-xs">
              Tiệm hỗ trợ thanh toán thẻ quốc tế Visa/Mastercard và thẻ ATM nội địa NAPAS. Để bạn test tính năng thanh toán, hãy dùng số thẻ Visa test: <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-[#E2E8D8] text-[#C2522D] font-bold">4111 1111 1111 1111</code> và mã OTP demo: <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-[#E2E8D8] text-[#08482D] font-bold">123456</code>.
            </p>
          </div>
        </div>
      )
    },
    about: {
      title: 'Về Tiệm "Đồ Cũ Còn Thương"',
      subtitle: 'Nơi những món đồ vintage tìm thấy người tri kỷ tiếp theo',
      icon: HeartHandshake,
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-[#5E5E61] leading-relaxed">
          <p>
            Ra đời từ tình yêu với những món đồ cũ mang đậm hơi thở thời gian, <strong>"Đồ Cũ Còn Thương"</strong> không đơn thuần là một trang thương mại điện tử, mà là một góc nhỏ tôn vinh lối sống bền vững và tái sử dụng.
          </p>
          <p>
            Mỗi chiếc máy ảnh film, chiếc áo khoác denim patina, hay cuốn sách ố vàng màu thời gian đều mang theo một linh hồn riêng. Khi bạn chọn mua một món đồ cũ được kiểm định kỹ lưỡng, bạn không chỉ tiết kiệm ngân sách mà còn góp phần giảm thiểu rác thải tiêu dùng và trao thêm một vòng đời ý nghĩa cho món đồ.
          </p>
          <div className="p-3 bg-[#F5F8EF] rounded-2xl border border-[#E2E8D8] italic text-[#101410] text-center">
            "Mỗi món đồ cũ đều còn một câu chuyện... và bạn chính là chương tiếp theo."
          </div>
        </div>
      )
    },
    contact: {
      title: 'Thông Tin Liên Hệ Tiệm',
      subtitle: 'Chúng tôi luôn lắng nghe và sẵn sàng hỗ trợ bạn mỗi ngày',
      icon: PhoneCall,
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-[#5E5E61] leading-relaxed">
          <div className="space-y-2 font-medium">
            <div className="p-3 bg-[#F5F8EF] rounded-2xl border border-[#E2E8D8] space-y-1">
              <div>📍 <strong>Cửa hàng chính:</strong> 128 Đường Hai Bà Trưng, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh</div>
              <div>📞 <strong>Hotline hỗ trợ:</strong> 0987 654 321 (8:00 – 21:00 hàng ngày)</div>
              <div>✉️ <strong>Hòm thư điện tử:</strong> docuconthuong@vintage.vn</div>
              <div>🕒 <strong>Giờ mở cửa đón khách:</strong> Thứ 2 – Chủ Nhật (9:00 – 20:30)</div>
            </div>
          </div>
        </div>
      )
    }
  };

  const current = contentMap[type];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative w-full max-w-xl bg-[#FFFFFF] rounded-3xl border-2 border-[#E2E8D8] shadow-2xl p-6 sm:p-8 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#DAE7C7]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#C2522D] text-white flex items-center justify-center flex-shrink-0 shadow-md">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-[#101410]">
                {current.title}
              </h3>
              <p className="text-xs text-[#5E5E61] mt-0.5">
                {current.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#DAE7C7] text-[#5E5E61] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="py-5 overflow-y-auto flex-1">
          {current.content}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[#DAE7C7] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl bg-[#101410] text-[#FFFFFF] text-xs font-bold hover:bg-[#C2522D] transition-colors shadow-sm"
          >
            Đã hiểu & Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
