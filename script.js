document.addEventListener('DOMContentLoaded', () => {
    // State: Memuat data dari LocalStorage
    let tasks = JSON.parse(localStorage.getItem('taskflow_tasks')) || [];
    
    // Setup Custom Dropdowns UI
    function setupCustomDropdowns() {
        document.querySelectorAll('.custom-select').forEach(dropdown => {
            const trigger = dropdown.querySelector('.custom-select-trigger');
            const options = dropdown.querySelectorAll('.custom-option');
            const textElement = dropdown.querySelector('.selected-text');
            const input = dropdown.querySelector('input[type="hidden"]');
            
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.custom-select').forEach(d => {
                    if (d !== dropdown) d.classList.remove('open');
                });
                dropdown.classList.toggle('open');
            });
            
            options.forEach(option => {
                option.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const val = option.dataset.value;
                    options.forEach(opt => opt.classList.remove('selected'));
                    option.classList.add('selected');
                    textElement.textContent = option.textContent;
                    input.value = val;
                    dropdown.classList.remove('open');
                    input.dispatchEvent(new Event('change'));
                });
            });
        });
        
        document.addEventListener('click', () => {
            document.querySelectorAll('.custom-select').forEach(d => d.classList.remove('open'));
        });
    }
    
    function setCustomDropdownValue(inputId, value) {
        const dropdown = document.querySelector(`#wrapper-${inputId}`);
        if(!dropdown) return;
        const input = document.getElementById(inputId);
        const textElement = dropdown.querySelector('.selected-text');
        const options = dropdown.querySelectorAll('.custom-option');
        
        input.value = value;
        options.forEach(opt => opt.classList.remove('selected'));
        const selectedOpt = Array.from(options).find(opt => opt.dataset.value === value);
        if (selectedOpt) {
            selectedOpt.classList.add('selected');
            textElement.textContent = selectedOpt.textContent;
        }
    }

    setupCustomDropdowns();
    
    // DOM Elements
    const taskForm = document.getElementById('taskForm');
    const tasksContainer = document.getElementById('tasksContainer');
    const filterStatus = document.getElementById('filterStatus');
    const sortTasks = document.getElementById('sortTasks');
    
    // Inisialisasi
    function init() {
        // Load persistensi filter & sort
        const savedSort = localStorage.getItem('taskflow_sort');
        const savedFilter = localStorage.getItem('taskflow_filter');
        
        if (savedSort) setCustomDropdownValue('sortTasks', savedSort);
        if (savedFilter) setCustomDropdownValue('filterStatus', savedFilter);
        
        renderTasks();
        
        // Update countdown secara real-time setiap menit tanpa merender ulang seluruh komponen
        setInterval(updateCountdowns, 60000);
    }
    
    // Event Listeners
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const newTask = {
            id: Date.now().toString(),
            name: document.getElementById('taskName').value.trim(),
            subject: document.getElementById('subject').value.trim(),
            deadline: document.getElementById('deadline').value,
            description: document.getElementById('description').value.trim(),
            completed: false,
            createdAt: Date.now()
        };
        
        tasks.push(newTask);
        saveTasks();
        
        // Reset form input
        taskForm.reset();
        
        // Pastikan pengguna bisa melihat tugas baru tersebut (ubah filter ke 'all' jika sedang di tab 'completed')
        if (filterStatus.value === 'completed') {
            setCustomDropdownValue('filterStatus', 'all');
            localStorage.setItem('taskflow_filter', 'all');
        }
        
        renderTasks();
    });
    
    filterStatus.addEventListener('change', () => {
        localStorage.setItem('taskflow_filter', filterStatus.value);
        renderTasks();
    });
    
    sortTasks.addEventListener('change', () => {
        localStorage.setItem('taskflow_sort', sortTasks.value);
        renderTasks();
    });
    
    // Event Delegation untuk interaksi Kartu Tugas
    tasksContainer.addEventListener('click', (e) => {
        const taskCard = e.target.closest('.task-card');
        if (!taskCard) return;
        
        const id = taskCard.dataset.id;
        
        // Handle klik toggle/checkbox (Pastikan kita hanya memproses klik dari checkbox bukan container)
        if (e.target.closest('.task-checkbox-container') && e.target.tagName !== 'INPUT') {
            e.preventDefault(); 
            toggleStatus(id);
        }
        
        // Menangani Perubahan Langsung dari Input (jika terklik input asli)
        if (e.target.tagName === 'INPUT' && e.target.type === 'checkbox') {
             toggleStatus(id);
        }
        
        // Handle hapus
        if(e.target.closest('.delete-btn')) {
            deleteTask(id);
        }
    });
    
    // Logika Inti
    function saveTasks() {
        localStorage.setItem('taskflow_tasks', JSON.stringify(tasks));
    }
    
    function toggleStatus(id) {
        const taskIndex = tasks.findIndex(t => t.id === id);
        if (taskIndex !== -1) {
            tasks[taskIndex].completed = !tasks[taskIndex].completed;
            saveTasks();
            renderTasks();
        }
    }
    
    function deleteTask(id) {
        if(confirm('Apakah Anda yakin ingin menghapus tugas ini?')) {
            tasks = tasks.filter(t => t.id !== id);
            saveTasks();
            renderTasks();
        }
    }
    
    // Helper: Hitung Mundur / Selisih Waktu
    function getCountdownText(deadlineStr) {
        const deadline = new Date(deadlineStr).getTime();
        const now = Date.now();
        const diff = deadline - now;
        
        if (diff < 0) {
            return { text: 'Terlambat!', status: 'overdue' };
        }
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 1) {
            return { text: `Sisa ${days} Hari`, status: 'normal' };
        } else if (days === 1) {
            return { text: `Besok! (${hours} Jam lagi)`, status: 'urgent' };
        } else if (hours > 0) {
            return { text: `Sisa ${hours} Jam ${minutes} Mnt`, status: 'urgent' };
        } else {
            return { text: `Sisa ${minutes} Menit!`, status: 'urgent' };
        }
    }
    
    function formatDateStr(dateStr) {
        const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateStr).toLocaleDateString('id-ID', options);
    }
    
    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
    
    // Proses Render UI
    function renderTasks() {
        tasksContainer.innerHTML = '';
        
        // 1. Filter
        let filteredTasks = tasks.filter(task => {
            if (filterStatus.value === 'pending') return !task.completed;
            if (filterStatus.value === 'completed') return task.completed;
            return true;
        });
        
        // 2. Sort
        filteredTasks.sort((a, b) => {
            const timeA = new Date(a.deadline).getTime();
            const timeB = new Date(b.deadline).getTime();
            
            if (sortTasks.value === 'nearest') {
                return timeA - timeB;
            } else {
                return timeB - timeA;
            }
        });
        
        // Zero State
        if (filteredTasks.length === 0) {
            tasksContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; color: rgba(255,255,255,0.5); padding: 3rem;">
                    <p style="font-size: 1.2rem; margin-bottom: 0.5rem;">Tidak ada tugas yang sesuai di sini.</p>
                </div>
            `;
            return;
        }
        
        // Rendering
        filteredTasks.forEach((task, index) => {
            const delay = index * 0.05; // Efek stagger ringan untuk animasi
            
            const countdown = getCountdownText(task.deadline);
            let badgeClass = countdown.status; 
            
            if (task.completed) badgeClass = 'normal';
            
            const card = document.createElement('div');
            card.className = `task-card animate-slide-up ${task.completed ? 'completed' : ''}`;
            card.style.animationDelay = `${delay}s`;
            card.dataset.id = task.id;
            
            card.innerHTML = `
                <div class="task-header">
                    <div>
                        <h3 class="task-title">${escapeHTML(task.name)}</h3>
                        <p class="task-subject">${escapeHTML(task.subject)}</p>
                    </div>
                    <label class="task-checkbox-container" aria-label="Tandai Selesai">
                        <input type="checkbox" ${task.completed ? 'checked' : ''}>
                        <span class="checkmark"></span>
                    </label>
                </div>
                
                <div class="task-desc">${escapeHTML(task.description)}</div>
                
                <div class="task-footer">
                    <div class="countdown-badge ${badgeClass}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        <span class="cd-text">${task.completed ? 'Selesai' : countdown.text}</span>
                    </div>
                    
                    <div class="task-actions">
                        <button class="delete-btn" aria-label="Hapus Tugas" title="Hapus">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </div>
            `;
            
            tasksContainer.appendChild(card);
        });
    }
    
    // Update live countdowns tanpa re-render (agar tidak flicker)
    function updateCountdowns() {
        const cards = tasksContainer.querySelectorAll('.task-card:not(.completed)');
        cards.forEach(card => {
            const id = card.dataset.id;
            const task = tasks.find(t => t.id === id);
             
            if (task) {
                const countdown = getCountdownText(task.deadline);
                const badge = card.querySelector('.countdown-badge');
                const textSpan = badge.querySelector('.cd-text');
                
                textSpan.textContent = countdown.text;
                badge.className = `countdown-badge ${countdown.status}`;
                
                if(task.completed) badge.className = 'countdown-badge normal';
            }
        });
    }
    
    // Jalankan aplikasi
    init();
});
