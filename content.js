function createNotepad() {
    const notepadHTML = `
        <div id="browser-notepad" class="notepad-hidden">
            <div id="notepad-header">
                <button id="notepad-close">×</button>
            </div>
            <div id="notepad-content">
                <textarea id="notepad-textarea" placeholder="Type your notes here..."></textarea>
            </div>
        </div>
    `;

    // 检查是否已存在notepad实例
    if (document.getElementById('browser-notepad')) {
        return;
    }

    document.body.insertAdjacentHTML('beforeend', notepadHTML);

    const notepad = document.getElementById('browser-notepad');
    const textarea = document.getElementById('notepad-textarea');
    const closeButton = document.getElementById('notepad-close');
    let isVisible = false;
    let isLocked = false;
    let hideTimeout;
    let lastSavedContent = '';
    let lastUpdateTimestamp = 0;

    // CSS类的添加，使过渡更流畅
    const style = document.createElement('style');
    style.textContent = `
        #browser-notepad {
            position: fixed;
            right: 0;
            top: 0;
            width: 300px;
            height: 100vh;
            background: white;
            box-shadow: -2px 0 5px rgba(0,0,0,0.2);
            transition: all 0.3s ease-in-out;
            z-index: 999999;
            display: flex;
            flex-direction: column;
        }
        
        #browser-notepad.notepad-hidden {
            width: 20px;
        }
        
        #notepad-header {
            display: flex;
            justify-content: flex-end;
            padding: 5px;
            background-color: #f0f0f0;
        }
        
        #notepad-close {
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            padding: 0 5px;
        }
        
        #notepad-content {
            flex-grow: 1;
            opacity: 1;
            transition: opacity 0.3s ease-in-out;
        }
        
        .notepad-hidden #notepad-content,
        .notepad-hidden #notepad-header {
            opacity: 0;
        }
        
        #notepad-textarea {
            width: 100%;
            height: 100%;
            border: none;
            padding: 10px;
            resize: none;
            font-size: 14px;
        }
    `;
    document.head.appendChild(style);

    // 使用防抖函数来优化存储操作
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 保存内容的函数
    const saveContent = debounce((content) => {
        const timestamp = Date.now();
        chrome.storage.sync.set({
            notepadContent: content,
            lastUpdateTimestamp: timestamp
        });
        lastUpdateTimestamp = timestamp;
        lastSavedContent = content;
    }, 500);

    // 加载保存的内容
    chrome.storage.sync.get(['notepadContent', 'lastUpdateTimestamp'], function (result) {
        if (result.notepadContent) {
            textarea.value = result.notepadContent;
            lastSavedContent = result.notepadContent;
            lastUpdateTimestamp = result.lastUpdateTimestamp || Date.now();
        }
    });

    // 监听内容变化
    textarea.addEventListener('input', function () {
        clearTimeout(hideTimeout);
        isLocked = true;
        showNotepad();

        if (textarea.value !== lastSavedContent) {
            saveContent(textarea.value);
        }
    });

    // 优化焦点处理
    textarea.addEventListener('blur', function () {
        setTimeout(() => {
            if (!notepad.matches(':hover')) {
                isLocked = false;
                startHideTimer();
            }
        }, 200);
    });

    textarea.addEventListener('focus', function () {
        isLocked = true;
        showNotepad();
    });

    // 优化鼠标进出处理
    let mouseEnterTimeout;
    notepad.addEventListener('mouseenter', function () {
        clearTimeout(hideTimeout);
        clearTimeout(mouseEnterTimeout);
        mouseEnterTimeout = setTimeout(() => {
            showNotepad();
        }, 100);
    });

    notepad.addEventListener('mouseleave', function () {
        clearTimeout(mouseEnterTimeout);
        if (!isLocked && !textarea.matches(':focus')) {
            startHideTimer();
        }
    });

    // 添加关闭按钮功能
    closeButton.addEventListener('click', function () {
        hideNotepad();
        isLocked = false;
    });

    function showNotepad() {
        notepad.classList.remove('notepad-hidden');
        isVisible = true;
    }

    function hideNotepad() {
        notepad.classList.add('notepad-hidden');
        isVisible = false;
    }

    function startHideTimer() {
        clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => {
            if (!isLocked && !textarea.matches(':focus')) {
                hideNotepad();
            }
        }, 2000);
    }

    // 优化鼠标移动检测
    let mouseMoveTimer;
    document.addEventListener('mousemove', (e) => {
        clearTimeout(mouseMoveTimer);
        mouseMoveTimer = setTimeout(() => {
            const windowWidth = window.innerWidth;
            const mouseX = e.clientX;

            if (mouseX > windowWidth - 50) {
                clearTimeout(hideTimeout);
                showNotepad();
            } else if (isVisible && !isLocked && !textarea.matches(':focus')) {
                startHideTimer();
            }
        }, 50);
    });

    // 监听存储变化，实现多标签页同步
    chrome.storage.onChanged.addListener(function (changes, namespace) {
        if (namespace === 'sync' && changes.notepadContent) {
            const newContent = changes.notepadContent.newValue;
            const newTimestamp = changes.lastUpdateTimestamp?.newValue;

            // 只有当新的时间戳大于本地时间戳时才更新内容
            if (newTimestamp && newTimestamp > lastUpdateTimestamp) {
                textarea.value = newContent;
                lastSavedContent = newContent;
                lastUpdateTimestamp = newTimestamp;
            }
        }
    });
}

// 确保只创建一个实例
if (!window.notepadInitialized) {
    window.notepadInitialized = true;
    createNotepad();
}