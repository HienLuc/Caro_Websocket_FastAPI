class GameLogic:
    def __init__(self):
        # Kích thước bàn cờ (nên khớp với Frontend)
        self.BOARD_SIZE = 15 

    def check_valid_move(self, board: list, row: int, col: int) -> bool:
        """
        Kiểm tra nước đi hợp lệ:
        1. Tọa độ nằm trong bàn cờ.
        2. Ô chưa có quân.
        """
        # 1. Kiểm tra biên
        if not (0 <= row < self.BOARD_SIZE and 0 <= col < self.BOARD_SIZE):
            return False
        
        # 2. Kiểm tra ô trống (giả sử 0 là trống)
        if board[row][col] != 0:
            return False
            
        return True

    def check_full_board(self, board: list) -> bool:
        """
        Kiểm tra bàn cờ đã đầy chưa (Xử lý hòa).
        Trả về True nếu không còn ô trống nào.
        """
        for r in range(self.BOARD_SIZE):
            for c in range(self.BOARD_SIZE):
                if board[r][c] == 0:
                    return False
        return True

    def check_win(self, board: list, row: int, col: int, player_id: int) -> bool:
        """
        Kiểm tra chiến thắng với luật:
        - 5 quân liên tiếp.
        - KHÔNG bị chặn 2 đầu bởi đối thủ (Luật Caro Việt Nam).
        """
        directions = [
            (0, 1),   # Ngang
            (1, 0),   # Dọc
            (1, 1),   # Chéo chính (Đông Nam)
            (1, -1)   # Chéo phụ (Đông Bắc)
        ]

        # Xác định ID đối thủ (Nếu mình là 1 thì địch là 2, và ngược lại)
        opponent_id = 2 if player_id == 1 else 1

        for dr, dc in directions:
            count = 1  # Đếm quân vừa đánh
            
            # --- Duyệt chiều dương (+) ---
            r_pos, c_pos = row + dr, col + dc
            while 0 <= r_pos < self.BOARD_SIZE and 0 <= c_pos < self.BOARD_SIZE and board[r_pos][c_pos] == player_id:
                count += 1
                r_pos += dr
                c_pos += dc
            
            # --- Duyệt chiều âm (-) ---
            r_neg, c_neg = row - dr, col - dc
            while 0 <= r_neg < self.BOARD_SIZE and 0 <= c_neg < self.BOARD_SIZE and board[r_neg][c_neg] == player_id:
                count += 1
                r_neg -= dr
                c_neg -= dc

            # Nếu đủ 5 quân trở lên -> Kiểm tra điều kiện chặn 2 đầu
            if count >= 5:
                # Kiểm tra đầu dương có bị chặn không?
                # (Bị chặn nếu ô tiếp theo nằm trong bàn cờ VÀ là quân địch)
                is_blocked_pos = False
                if 0 <= r_pos < self.BOARD_SIZE and 0 <= c_pos < self.BOARD_SIZE:
                    if board[r_pos][c_pos] == opponent_id:
                        is_blocked_pos = True
                
                # Kiểm tra đầu âm có bị chặn không?
                is_blocked_neg = False
                if 0 <= r_neg < self.BOARD_SIZE and 0 <= c_neg < self.BOARD_SIZE:
                    if board[r_neg][c_neg] == opponent_id:
                        is_blocked_neg = True

                # Nếu bị chặn cả 2 đầu -> KHÔNG TÍNH THẮNG (Luật VN)
                if is_blocked_pos and is_blocked_neg:
                    continue # Bỏ qua hướng này, xét hướng khác
                
                # Nếu không bị chặn 2 đầu -> THẮNG
                return True

        return False

# ==========================================
# PHẦN TEST CHẠY THỬ (Unit Test)
# ==========================================
if __name__ == "__main__":
    logic = GameLogic()
    
    # Tạo bàn cờ rỗng
    fake_board = [[0 for _ in range(15)] for _ in range(15)]

    print("\n--- BẮT ĐẦU TEST LOGIC ---")

    # TEST 1: Check Valid
    print("1. Test nước đi hợp lệ:")
    fake_board[5][5] = 1
    if not logic.check_valid_move(fake_board, 5, 5):
        print("   -> OK: Không cho đánh đè lên quân cũ.")
    else:
        print("   -> LỖI: Vẫn cho đánh đè!")

    # TEST 2: Thắng thường (Ngang)
    print("\n2. Test thắng thường (5 ô ngang):")
    # Reset row 8
    for c in range(15): fake_board[8][c] = 0
    # Xếp: X X X X _
    for c in range(4): fake_board[8][c] = 1
    # Đánh con thứ 5
    fake_board[8][4] = 1
    if logic.check_win(fake_board, 8, 4, 1):
        print("   -> OK: Đã nhận diện chiến thắng.")
    else:
        print("   -> LỖI: Không nhận diện được chiến thắng.")

    # TEST 3: Luật chặn 2 đầu (Quan trọng)
    print("\n3. Test luật chặn 2 đầu (O X X X X X O):")
    # Reset row 9
    for c in range(15): fake_board[9][c] = 0
    
    # Xếp tình huống: O X X X X _ O (Địch chặn 2 đầu, chừa 1 lỗ ở giữa để mình đánh)
    fake_board[9][0] = 2 # Địch chặn trái
    fake_board[9][1] = 1
    fake_board[9][2] = 1
    fake_board[9][3] = 1
    fake_board[9][4] = 1
    fake_board[9][6] = 2 # Địch chặn phải
    
    # Mình đánh vào ô trống (9, 5) để tạo thành 5 con
    fake_board[9][5] = 1
    
    is_win = logic.check_win(fake_board, 9, 5, 1)
    if is_win:
        print("   -> LỖI: Bị chặn 2 đầu mà vẫn báo thắng!")
    else:
        print("   -> OK: Bị chặn 2 đầu nên KHÔNG tính thắng (Đúng luật).")

    print("\n--- KẾT THÚC TEST ---")