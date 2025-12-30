const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

// Riroschool credentials from environment
const CNSA_ID = process.env.CNSA_ID;
const CNSA_PW = process.env.CNSA_PW;

// Production start date: 2026년 1월 7일
const PRODUCTION_START_DATE = new Date('2026-01-07T00:00:00+09:00');

// Check if we're in production mode
function isProductionMode() {
  return new Date() >= PRODUCTION_START_DATE;
}

// Parse student ID: 10823 -> { grade: 1, class: '108', number: 23 }
function parseStudentId(studentId) {
  const idStr = studentId.toString().padStart(5, '0');
  const grade = parseInt(idStr[0]);
  const classNum = idStr.substring(0, 3); // e.g., '108'
  const number = parseInt(idStr.substring(3)); // e.g., 23
  return { grade, classNum, number };
}

// SMS message template
const SMS_MESSAGE = `안녕하세요. 충남삼성고등학교입니다.

본 메시지는 금일 08:30 면학실 출석 확인이 되지 않은 학생을 대상으로 자동 발송됩니다.
면학실 출석 확인은 08:30부터 면학실에서 진행되오니,
해당 학생은 출석 확인 후 방과후 교실로 이동해 주시기 바랍니다.

원활한 운영을 위해 협조 부탁드립니다.
감사합니다.

충남삼성고등학교 드림`;

const SMS_TITLE = '방과후학교 면학 출결 안내';

const TEST_MESSAGE = '이 메시지는 신규 프로그램 테스트를 위해 자동으로 보내진 메시지입니다.';

// Robust login function using role-based selectors
async function loginToRiroschool(page) {
  console.log('Logging into Riroschool...');

  // Go directly to login page
  await page.goto('https://cnsa.riroschool.kr/user.php?action=signin', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);

  console.log('Current URL:', page.url());

  // Use role-based selectors (most reliable for this page)
  try {
    // Fill ID using role selector
    const idInput = page.getByRole('textbox', { name: '학교 아이디 또는 통합 아이디(이메일)' });
    await idInput.fill(CNSA_ID);
    console.log('ID entered:', CNSA_ID);

    // Fill password using role selector
    const pwInput = page.getByRole('textbox', { name: '비밀번호' });
    await pwInput.fill(CNSA_PW);
    console.log('Password entered');

    // Click login button
    const loginBtn = page.getByRole('button', { name: '로그인' });
    await loginBtn.click();
    console.log('Login button clicked');

  } catch (e) {
    console.log('Role-based login failed, trying fallback:', e.message);

    // Fallback: use CSS selectors for visible inputs
    const idInput = await page.locator('input[type="text"]:visible').first();
    await idInput.fill(CNSA_ID);

    const pwInput = await page.locator('input[type="password"]:visible').first();
    await pwInput.fill(CNSA_PW);

    const loginBtn = await page.locator('button:has-text("로그인"):visible').first();
    await loginBtn.click();
  }

  await page.waitForTimeout(3000);
  console.log('Login completed, current URL:', page.url());
}

// Test SMS sending to 민수정 선생님
async function sendTestSMS() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Handle dialogs
    page.on('dialog', async dialog => {
      console.log('Dialog:', dialog.message());
      await dialog.accept();
    });

    // Login
    await loginToRiroschool(page);

    // Navigate to SMS page
    await page.goto('https://cnsa.riroschool.kr/sms.php?action=send', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
    console.log('Navigated to SMS page');

    // Click 선생님 directory
    console.log('Opening 선생님 directory...');
    await page.evaluate(() => {
      const items = document.querySelectorAll('li');
      for (const item of items) {
        if (item.textContent.includes('선생님') && !item.textContent.includes('선생님(')) {
          item.click();
          break;
        }
      }
    });
    await page.waitForTimeout(1000);

    // Click 업무담당자 directory
    console.log('Opening 업무담당자 directory...');
    await page.evaluate(() => {
      const items = document.querySelectorAll('li');
      for (const item of items) {
        if (item.textContent.includes('업무담당자')) {
          item.click();
          break;
        }
      }
    });
    await page.waitForTimeout(1000);

    // Scroll and find 민수정
    console.log('Finding 민수정...');
    let found = false;
    for (let i = 0; i < 10; i++) {
      found = await page.evaluate(() => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          if (walker.currentNode.textContent.includes('민수정')) {
            const parent = walker.currentNode.parentElement;
            const listItem = parent.closest('li');
            if (listItem) {
              const checkbox = listItem.querySelector('input[type="checkbox"]');
              if (checkbox) {
                checkbox.click();
                return true;
              }
            }
          }
        }
        return false;
      });

      if (found) break;

      // Scroll the list
      await page.evaluate(() => {
        const lists = document.querySelectorAll('ul');
        for (const list of lists) {
          if (list.scrollHeight > list.clientHeight) {
            list.scrollTop += 300;
          }
        }
      });
      await page.waitForTimeout(500);
    }

    if (!found) {
      throw new Error('민수정 선생님을 찾을 수 없습니다');
    }
    console.log('민수정 selected');

    // Click 선생님 recipient checkbox
    console.log('Selecting 선생님 as recipient...');
    await page.evaluate(() => {
      const labels = document.querySelectorAll('label');
      for (const label of labels) {
        if (label.textContent.includes('선생님')) {
          const checkbox = label.querySelector('input[type="checkbox"]') ||
                          document.getElementById(label.getAttribute('for'));
          if (checkbox && !checkbox.checked) {
            checkbox.click();
            return;
          }
        }
      }
      // Fallback
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      for (const cb of checkboxes) {
        const text = cb.parentElement?.textContent || '';
        if (text.includes('선생님') && !cb.checked) {
          cb.click();
          break;
        }
      }
    });
    await page.waitForTimeout(500);

    // Enter message
    console.log('Entering message...');
    await page.evaluate((msg) => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.value = msg;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, TEST_MESSAGE);
    await page.waitForTimeout(500);

    // Select 모두 문자
    console.log('Selecting 모두 문자...');
    await page.evaluate(() => {
      const allSmsRadio = document.querySelector('#allsms');
      if (allSmsRadio) allSmsRadio.click();
    });
    await page.waitForTimeout(500);

    // Enter password
    console.log('Entering password...');
    await page.evaluate((pw) => {
      const pwInput = document.querySelector('input[type="password"]');
      if (pwInput) {
        pwInput.value = pw;
        pwInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, CNSA_PW);
    await page.waitForTimeout(500);

    // Click send button
    console.log('Clicking send button...');
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, input[type="button"], input[type="submit"]');
      for (const btn of buttons) {
        if (btn.textContent?.includes('발송') || btn.value?.includes('발송')) {
          btn.click();
          return;
        }
      }
    });
    await page.waitForTimeout(3000);

    console.log('Test SMS sent successfully');
    return { status: 'success', message: 'Test SMS sent to 민수정 선생님' };

  } catch (err) {
    console.error('Error:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

// Production SMS sending to students
async function sendAbsentSMS(absentStudents) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const results = [];

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Handle dialogs
    page.on('dialog', async dialog => {
      console.log('Dialog:', dialog.message());
      await dialog.accept();
    });

    // Login
    await loginToRiroschool(page);

    // Navigate to SMS page
    await page.goto('https://cnsa.riroschool.kr/sms.php?action=send', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
    console.log('Navigated to SMS page');

    for (const student of absentStudents) {
      try {
        const { grade, classNum, number } = parseStudentId(student.studentId);
        console.log(`Processing student: ${student.name} (${grade}학년 ${classNum}반 ${number}번)`);

        // Clear previous selections
        await page.evaluate(() => {
          const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
          checkboxes.forEach(cb => cb.click());
        });
        await page.waitForTimeout(500);

        // Click 학생 directory
        await page.evaluate(() => {
          const items = document.querySelectorAll('li');
          for (const item of items) {
            const text = item.textContent || '';
            if (text.includes('학생') && !text.includes('학생(본인)')) {
              item.click();
              break;
            }
          }
        });
        await page.waitForTimeout(800);

        // Click grade (학년)
        await page.evaluate((g) => {
          const items = document.querySelectorAll('li');
          for (const item of items) {
            if (item.textContent.includes(`${g}학년`)) {
              item.click();
              break;
            }
          }
        }, grade);
        await page.waitForTimeout(800);

        // Click class (반) - classNum is like '108', need to show as '108반'
        await page.evaluate((c) => {
          const items = document.querySelectorAll('li');
          for (const item of items) {
            if (item.textContent.includes(`${c}반`)) {
              item.click();
              break;
            }
          }
        }, classNum);
        await page.waitForTimeout(800);

        // Find student by number and name
        let studentFound = false;
        for (let i = 0; i < 10; i++) {
          studentFound = await page.evaluate((num, name) => {
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            while (walker.nextNode()) {
              const text = walker.currentNode.textContent;
              if (text.includes(name) || text.includes(`${num}번`)) {
                const parent = walker.currentNode.parentElement;
                const listItem = parent.closest('li');
                if (listItem) {
                  const checkbox = listItem.querySelector('input[type="checkbox"]');
                  if (checkbox) {
                    checkbox.click();
                    return true;
                  }
                }
              }
            }
            return false;
          }, number, student.name);

          if (studentFound) break;

          // Scroll
          await page.evaluate(() => {
            const lists = document.querySelectorAll('ul');
            for (const list of lists) {
              if (list.scrollHeight > list.clientHeight) {
                list.scrollTop += 300;
              }
            }
          });
          await page.waitForTimeout(500);
        }

        if (!studentFound) {
          console.log(`Student ${student.name} not found`);
          results.push({ student: student.name, status: 'error', message: 'Student not found' });
          continue;
        }

        // Select recipients: 학생(본인) + 어머니
        await page.evaluate(() => {
          const labels = document.querySelectorAll('label');
          for (const label of labels) {
            const text = label.textContent || '';
            if (text.includes('학생(본인)') || text.includes('어머니')) {
              const checkbox = label.querySelector('input[type="checkbox"]') ||
                              document.getElementById(label.getAttribute('for'));
              if (checkbox && !checkbox.checked) {
                checkbox.click();
              }
            }
          }
        });
        await page.waitForTimeout(500);

        // Enter title if available
        await page.evaluate((title) => {
          const titleInput = document.querySelector('input[name="title"], input[placeholder*="제목"]');
          if (titleInput) {
            titleInput.value = title;
            titleInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }, SMS_TITLE);

        // Enter message
        await page.evaluate((msg) => {
          const textarea = document.querySelector('textarea');
          if (textarea) {
            textarea.value = msg;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }, SMS_MESSAGE);
        await page.waitForTimeout(500);

        // Select 모두 문자
        await page.evaluate(() => {
          const allSmsRadio = document.querySelector('#allsms');
          if (allSmsRadio) allSmsRadio.click();
        });
        await page.waitForTimeout(500);

        // Enter password
        await page.evaluate((pw) => {
          const pwInput = document.querySelector('input[type="password"]');
          if (pwInput) {
            pwInput.value = pw;
            pwInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }, CNSA_PW);
        await page.waitForTimeout(500);

        // Click send button
        await page.evaluate(() => {
          const buttons = document.querySelectorAll('button, input[type="button"], input[type="submit"]');
          for (const btn of buttons) {
            if (btn.textContent?.includes('발송') || btn.value?.includes('발송')) {
              btn.click();
              return;
            }
          }
        });
        await page.waitForTimeout(3000);

        console.log(`SMS sent to ${student.name}`);
        results.push({ student: student.name, status: 'success', message: 'SMS sent to 학생 + 어머니' });

      } catch (err) {
        console.error(`Error sending SMS to ${student.name}:`, err.message);
        results.push({ student: student.name, status: 'error', message: err.message });
      }
    }

  } finally {
    await browser.close();
  }

  return results;
}

// API Endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mode: isProductionMode() ? 'production' : 'test',
    productionStartDate: PRODUCTION_START_DATE.toISOString()
  });
});

// Test endpoint - sends to 민수정 선생님
app.post('/api/test-sms', async (req, res) => {
  if (!CNSA_ID || !CNSA_PW) {
    return res.status(500).json({ error: 'CNSA credentials not configured' });
  }

  try {
    console.log('Sending test SMS to 민수정 선생님...');
    const result = await sendTestSMS();
    res.json(result);
  } catch (err) {
    console.error('Test SMS error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Main endpoint - behavior depends on date
app.post('/api/send-absent-sms', async (req, res) => {
  const { absentStudents } = req.body;

  if (!CNSA_ID || !CNSA_PW) {
    return res.status(500).json({ error: 'CNSA credentials not configured' });
  }

  // Before production date: send test to 민수정
  if (!isProductionMode()) {
    console.log('Test mode: sending to 민수정 instead of students');
    try {
      const result = await sendTestSMS();
      res.json({
        mode: 'test',
        message: '테스트 모드: 민수정 선생님에게 발송됨 (2026-01-07 이후 학생에게 발송)',
        absentStudentsReceived: absentStudents?.length || 0,
        result
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  // Production mode: send to students
  if (!absentStudents || !Array.isArray(absentStudents) || absentStudents.length === 0) {
    return res.status(400).json({
      error: 'absentStudents array is required',
      example: [{ studentId: '10823', name: '홍길동' }]
    });
  }

  try {
    console.log(`Sending SMS to ${absentStudents.length} absent students...`);
    const results = await sendAbsentSMS(absentStudents);

    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'error').length;

    res.json({
      mode: 'production',
      message: `SMS sending completed: ${successful} success, ${failed} failed`,
      results
    });
  } catch (err) {
    console.error('SMS sending error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`VIC SMS Server running on port ${PORT}`);
  console.log(`Mode: ${isProductionMode() ? 'PRODUCTION' : 'TEST'}`);
  console.log(`Production starts: ${PRODUCTION_START_DATE.toISOString()}`);
});
