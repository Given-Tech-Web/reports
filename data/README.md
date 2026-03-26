# 사용자 데이터 관리

## 데이터베이스 기반 인증 시스템

이 시스템은 MariaDB 데이터베이스의 `users` 테이블을 사용하여 사용자 인증을 관리합니다.

## 초기 관리자 계정

시스템에 사용자가 없을 경우, 다음 초기 관리자 계정으로 로그인할 수 있습니다:
- **사용자명**: admin
- **초기 비밀번호**: admin123

첫 로그인 시 자동으로 관리자 계정이 생성됩니다.

## 중요 사항

1. **보안 경고**: 배포 전에 반드시 초기 비밀번호를 변경하세요!
2. **데이터베이스**: MariaDB의 `mysolar` 데이터베이스에 `users` 테이블을 사용합니다.
3. **백업**: 프로덕션 환경에서는 정기적으로 데이터베이스를 백업하세요.

## MariaDB users 테이블 구조

```sql
CREATE TABLE users (
  id VARCHAR(50) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  role VARCHAR(20) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## 비밀번호 변경

1. 관리자 페이지 접속: `/admin`
2. 설정 메뉴 클릭
3. 현재 비밀번호와 새 비밀번호 입력
4. 변경 버튼 클릭

## 새 사용자 추가 (SQL)

관리자가 데이터베이스에 직접 새 사용자를 추가하려면:

```sql
-- 비밀번호 해시는 Node.js에서 생성해야 합니다
-- 예: node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('새비밀번호', 10));"

INSERT INTO users (id, username, password, name, role)
VALUES ('user-002', '새사용자명', '해시된비밀번호', '사용자이름', 'admin');
```

## 문제 해결

### "User not found" 오류
- 데이터베이스 연결 확인
- users 테이블이 존재하는지 확인
- username이 정확한지 확인

### 비밀번호 분실
1. 데이터베이스에 직접 접속
2. 새 비밀번호 해시 생성:
   ```bash
   node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('새비밀번호', 10));"
   ```
3. 데이터베이스에서 비밀번호 업데이트:
   ```sql
   UPDATE users SET password = '새해시값' WHERE username = 'admin';
   ```

## 로컬 파일 시스템 (users.json) - 더 이상 사용하지 않음

이전 버전에서는 `data/users.json` 파일을 사용했으나, 현재는 MariaDB를 사용합니다.
만약 마이그레이션이 필요한 경우, `database/init-users.sql` 스크립트를 참조하세요.