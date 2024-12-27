function createNotepad() {
    const notepadHTML = `
        <div id="browser-notepad" class="notepad-hidden">
            <div id="notepad-header">
                <div id="notepad-title">Quick Notes</div>
                <button id="notepad-close">×</button>
            </div>
            <div id="notepad-content">
                <textarea id="notepad-textarea" placeholder="Type your notes here..."></textarea>
            </div>
            <div id="notepad-footer">
                <span id="notepad-status">Auto-saved</span>
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
            left: 0;
            top: 0;
            width: 320px;
            height: 100vh;
            background: #f8f9fa;
            box-shadow: -5px 0 15px rgba(0,0,0,0.1);
            transition: all 0.15s ease-out;
            z-index: 999999;
            display: flex;
            flex-direction: column;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            border-right: 1px solid #e0e0e0;
        }

        
        #browser-notepad.notepad-hidden {
            width: 0.1px;
            background: transparent;
            box-shadow: none;
            border-left: none;
        }
        
        #notepad-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 15px;
            background-color: #4a90e2;
            color: white;
            transition: opacity 0.1s ease-out;  
        }
        
        #notepad-title {
            font-size: 16px;
            font-weight: bold;
        }
        
        #notepad-close {
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            padding: 0 5px;
            transition: opacity 0.1s ease-out;  
        }
        
        #notepad-close:hover {
            transform: scale(1.2);
        }
        
        #notepad-content {
            flex-grow: 1;
            transition: opacity 0.1s ease-out; /* 加快过渡时间 */
            padding: 10px;
        }
        
        #notepad-footer {
            padding: 8px 15px;
            background-color: #e9ecef;
            color: #495057;
            font-size: 12px;
            text-align: right;
            border-top: 1px solid #dee2e6;
            transition: opacity 0.1s ease-out; /* 加快过渡时间 */

        }
        
        .notepad-hidden #notepad-content,
        .notepad-hidden #notepad-header,
        .notepad-hidden #notepad-footer {
            opacity: 0;
            pointer-events: none;
        }
        
        #notepad-textarea {
            width: 100%;
            height: 100%;
            border: none;
            background-color: transparent;
            padding: 10px;
            resize: none;
            font-size: 14px;
            line-height: 1.5;
            color: #333;
        }
        
        #notepad-textarea:focus {
            outline: none;
        }
        
        #notepad-textarea::placeholder {
            color: #adb5bd;
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
    // 更新保存内容的函数
    const saveContent = debounce((content) => {
        const timestamp = Date.now();
        chrome.storage.sync.set({
            notepadContent: content,
            lastUpdateTimestamp: timestamp
        }, () => {
            // 发送消息到其他标签页
            chrome.runtime.sendMessage({
                action: 'contentUpdated',
                content: content,
                timestamp: timestamp
            });
        });
        lastUpdateTimestamp = timestamp;
        lastSavedContent = content;
    }, 300);

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

    // 修改焦点处理
    textarea.addEventListener('blur', function () {
        isLocked = false;
        startHideTimer();
    });

    textarea.addEventListener('focus', function () {
        clearTimeout(hideTimeout);
        isLocked = true;
        showNotepad();
    });

    // 优化鼠标进出处理
    let mouseEnterTimeout;
    notepad.addEventListener('mouseenter', function () {
        clearTimeout(hideTimeout);
        showNotepad();
    });

    notepad.addEventListener('mouseleave', function () {
        if (!textarea.matches(':focus')) {
            isLocked = false;
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
        isLocked = true;
    }


    function hideNotepad() {
        if (!isLocked) {
            notepad.classList.add('notepad-hidden');
            isVisible = false;
        }
    }


    function startHideTimer() {
        clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => {
            if (!isLocked) {
                hideNotepad();
            }
        }, 300);  // 减少延迟时间
    }

    // 优化鼠标移动检测
    let mouseMoveTimer;
    document.addEventListener('mousemove', (e) => {
        clearTimeout(mouseMoveTimer);
        mouseMoveTimer = setTimeout(() => {
            const mouseX = e.clientX;

            if (mouseX < 50) {  // 更改为检测左侧
                clearTimeout(hideTimeout);
                showNotepad();
            } else if (isVisible && !notepad.matches(':hover') && !textarea.matches(':focus')) {
                isLocked = false;
                startHideTimer();
            }
        }, 30);
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


    // 监听来自其他标签页的更新消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'contentUpdated' && message.timestamp > lastUpdateTimestamp) {
            textarea.value = message.content;
            lastSavedContent = message.content;
            lastUpdateTimestamp = message.timestamp;
        }
    });

    // 初始加载保存的内容
    chrome.storage.sync.get(['notepadContent', 'lastUpdateTimestamp'], function (result) {
        if (result.notepadContent) {
            textarea.value = result.notepadContent;
            lastSavedContent = result.notepadContent;
            lastUpdateTimestamp = result.lastUpdateTimestamp || Date.now();
        }
    });
}

// 确保只创建一个实例
if (!window.notepadInitialized) {
    window.notepadInitialized = true;
    createNotepad();
}