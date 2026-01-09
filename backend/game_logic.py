class GameLogic:
    def __init__(self):
        # Quy định kích thước bàn cờ (thường là 15x15 hoặc 20x20)
        # Bạn có thể điều chỉnh số này khớp với Frontend
        self.BOARD_SIZE = 15 

    def check_valid_move(self, board: list, row: int, col: int) -> bool:
        """
        Kiểm tra xem nước đi tại (row, col) có hợp lệ không.
        1. Tọa độ phải nằm trong bàn cờ (0 <= x < BOARD_SIZE).
        2. Ô đó phải đang trống (giá trị là 0 hoặc None hoặc rỗng).
        """
        # Kiểm tra biên (nằm ngoài bàn cờ thì sai)
        if row < 0 or row >= self.BOARD_SIZE or col < 0 or col >= self.BOARD_SIZE:
            return False
        
        # Kiểm tra ô đã có quân chưa (Giả sử 0 là ô trống)
        if board[row][col] != 0:
            return False
            
        return True

    def check_win(self, board: list, row: int, col: int, player_id: int) -> bool:
        """
        Kiểm tra chiến thắng ngay sau khi người chơi đánh vào (row, col).
        Thuật toán: Quét từ vị trí vừa đánh ra 4 hướng (Ngang, Dọc, Chéo chính, Chéo phụ).
        Nếu hướng nào đủ 5 quân liên tiếp của player_id thì thắng.
        """
        
        # Các hướng cần kiểm tra: (thay đổi hàng, thay đổi cột)
        directions = [
            (0, 1),   # Ngang (chỉ thay đổi cột)
            (1, 0),   # Dọc (chỉ thay đổi hàng)
            (1, 1),   # Chéo chính (hướng Đông Nam)
            (1, -1)   # Chéo phụ (hướng Đông Bắc)
        ]

        for dr, dc in directions:
            count = 1  # Đếm quân vừa đánh là 1
            
            # 1. Duyệt về phía dương (Positive direction)
            # Ví dụ: Nếu đang xét hàng ngang, thì duyệt sang phải
            r, c = row + dr, col + dc
            while 0 <= r < self.BOARD_SIZE and 0 <= c < self.BOARD_SIZE and board[r][c] == player_id:
                count += 1
                r += dr
                c += dc

            # 2. Duyệt về phía âm (Negative direction)
            # Ví dụ: Nếu đang xét hàng ngang, thì duyệt sang trái
            r, c = row - dr, col - dc
            while 0 <= r < self.BOARD_SIZE and 0 <= c < self.BOARD_SIZE and board[r][c] == player_id:
                count += 1
                r -= dr
                c -= dc

            # Nếu hướng này đủ 5 quân trở lên -> THẮNG
            if count >= 5:
                return True

        return False  

        # ==========================================
# PHẦN TEST CHẠY THỬ (Dán ở cuối file)
# ==========================================
if __name__ == "__main__":
    # 1. Khởi tạo logic game
    logic = GameLogic()
    
    # 2. Tạo một bàn cờ rỗng 15x15 (toàn số 0)
    # Giả sử: 0 là rỗng, 1 là Player X, 2 là Player O
    fake_board = [[0 for _ in range(15)] for _ in range(15)]

    print("--- BẮT ĐẦU TEST ---")

    # TEST 1: Đánh thử một nước hợp lệ
    row, col = 7, 7
    player_id = 1 # Người chơi 1
    
    # Giả vờ đánh vào bàn cờ
    fake_board[row][col] = player_id 
    
    print(f"Test 1: Đánh vào ô ({row}, {col})...")
    if logic.check_valid_move(fake_board, 0, 0): # Check ô (0,0) đang trống
        print("-> Check Valid: OK (Hợp lệ)")
    else:
        print("-> Check Valid: FAILED (Sai)")

    # TEST 2: Giả lập thắng (5 con liên tiếp hàng ngang)
    print("\nTest 2: Thử tạo 5 quân liên tiếp hàng ngang...")
    # Đặt sẵn 4 quân
    fake_board[8][0] = 1
    fake_board[8][1] = 1
    fake_board[8][2] = 1
    fake_board[8][3] = 1
    
    # Đánh quân thứ 5 vào vị trí (8, 4)
    fake_board[8][4] = 1 
    
    # Kiểm tra xem có báo thắng không
    is_win = logic.check_win(fake_board, 8, 4, 1)
    
    if is_win:
        print("-> KẾT QUẢ: ĐÚNG! (Đã phát hiện chiến thắng)")
    else:
        print("-> KẾT QUẢ: SAI! (Không phát hiện được chiến thắng)")

    print("--- KẾT THÚC TEST ---")