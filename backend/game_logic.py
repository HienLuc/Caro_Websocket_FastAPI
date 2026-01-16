from typing import List, Tuple

class GameLogic:
    def __init__(self, board_size: int = 15):
        # Cho phép tùy chỉnh size nếu cần thiết sau này
        self.BOARD_SIZE = board_size
        
        # Các hướng kiểm tra: Ngang, Dọc, Chéo chính (Đông Nam), Chéo phụ (Đông Bắc)
        self.DIRECTIONS = [
            (0, 1),   # Ngang
            (1, 0),   # Dọc
            (1, 1),   # Chéo chính
            (1, -1)   # Chéo phụ
        ]

    def is_valid_move(self, board: List[List[int]], row: int, col: int) -> bool:
        """
        Kiểm tra nước đi hợp lệ:
        1. Tọa độ nằm trong bàn cờ.
        2. Ô chưa có quân (giá trị 0).
        """
        # 1. Kiểm tra biên
        if not (0 <= row < self.BOARD_SIZE and 0 <= col < self.BOARD_SIZE):
            return False
        
        # 2. Kiểm tra ô trống
        if board[row][col] != 0:
            return False
            
        return True

    def is_board_full(self, board: List[List[int]]) -> bool:
        """
        Kiểm tra bàn cờ đã đầy chưa (Hòa).
        Trả về True nếu không còn ô trống nào (không còn số 0).
        """
        # Sử dụng generator expression để kiểm tra nhanh hơn và ngắn gọn hơn
        return all(cell != 0 for row_list in board for cell in row_list)

    def check_win(self, board: List[List[int]], row: int, col: int, player_id: int) -> bool:
        """
        Kiểm tra chiến thắng theo luật Caro Việt Nam:
        - Đủ 5 quân liên tiếp.
        - Không bị chặn 2 đầu bởi đối thủ.
        """
        # Xác định ID đối thủ
        opponent_id = 3 - player_id  # Nếu 1 -> 2, Nếu 2 -> 1 (giả sử ID là 1 và 2)

        for dr, dc in self.DIRECTIONS:
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

            # Chỉ xét thắng nếu đủ 5 quân trở lên
            if count >= 5:
                # Kiểm tra chặn đầu dương
                blocked_pos = False
                if 0 <= r_pos < self.BOARD_SIZE and 0 <= c_pos < self.BOARD_SIZE:
                    if board[r_pos][c_pos] == opponent_id:
                        blocked_pos = True
                
                # Kiểm tra chặn đầu âm
                blocked_neg = False
                if 0 <= r_neg < self.BOARD_SIZE and 0 <= c_neg < self.BOARD_SIZE:
                    if board[r_neg][c_neg] == opponent_id:
                        blocked_neg = True

                # Luật chặn 2 đầu: Nếu bị chặn cả 2 đầu thì KHÔNG thắng
                if blocked_pos and blocked_neg:
                    continue 
                
                return True

        return False