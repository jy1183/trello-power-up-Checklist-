'use client';

import { useState, useEffect } from 'react';
import Script from 'next/script';
import { CheckSquare, Clock } from 'lucide-react';

export default function ChecklistModal() {
  const [todos, setTodos] = useState<any[]>([]);
  const [overdueTodos, setOverdueTodos] = useState<any[]>([]);
  const [loadingTodos, setLoadingTodos] = useState(true);

  // Initialize Trello Power-Up context
  const [trello, setTrello] = useState<any>(null);

  useEffect(() => {
    fetchTodos();
    const initT = () => {
      if ((window as any).TrelloPowerUp) {
        setTrello((window as any).TrelloPowerUp.iframe());
      }
    };
    if ((window as any).TrelloPowerUp) {
      initT();
    } else {
      const interval = setInterval(() => {
        if ((window as any).TrelloPowerUp) {
          initT();
          clearInterval(interval);
        }
      }, 100);
      setTimeout(() => clearInterval(interval), 5000);
    }
  }, []);

  const fetchTodos = async () => {
    setLoadingTodos(true);
    try {
      const res = await fetch('/api/trello/checklists?days=13&overdue=true');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.details || data.error || 'Unknown server error');
      }
      if (data.tasks) setTodos(data.tasks);
      if (data.overdueTasks) setOverdueTodos(data.overdueTasks);
    } catch (e: any) { 
      console.error(e); 
      alert('서버 에러 원인: ' + e.message);
    } finally { setLoadingTodos(false); }
  };

  const handleCheck = async (taskId: string, cardId: string, currentState: string) => {
    const newState = currentState === 'complete' ? 'incomplete' : 'complete';
    const updateTask = (t: any) => t.id === taskId ? { ...t, state: newState } : t;
    setTodos(prev => prev.map(updateTask));
    
    try { 
      await fetch('/api/trello/checklists', { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ cardId, itemId: taskId, state: newState }) 
      }); 
    } catch (err: any) {
      console.error('Error updating task:', err);
      if (err.response && err.response.data) {
        console.error('Detailed API Error:', err.response.data);
      }
      const revertTask = (t: any) => t.id === taskId ? { ...t, state: currentState } : t; 
      setTodos(prev => prev.map(revertTask)); 
    }
  };

  const openCardInTrello = (cardId: string) => {
    if (trello) {
      trello.showCard(cardId);
    } else {
      console.warn("Trello instance not available");
    }
  };

  const handleDragStart = (e: React.DragEvent, task: any) => { e.dataTransfer.setData('task', JSON.stringify(task)); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = async (e: React.DragEvent, targetDayOffset: number) => {
    e.preventDefault(); const taskJson = e.dataTransfer.getData('task'); if (!taskJson) return;
    const task = JSON.parse(taskJson); if (task.dayIndex === targetDayOffset) return;
    const currentDue = new Date(task.due); const today = new Date(); today.setHours(0, 0, 0, 0);
    const newDate = new Date(today); newDate.setDate(today.getDate() + targetDayOffset);
    newDate.setHours(currentDue.getHours() || 12, currentDue.getMinutes() || 0, 0);
    const newDueIso = newDate.toISOString();
    const updateTask = (t: any) => t.id === task.id ? { ...t, dayIndex: targetDayOffset, due: newDueIso } : t;
    setTodos(prev => prev.map(updateTask));
    try { await fetch('/api/trello/checklists', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cardId: task.cardId, itemId: task.id, dueDate: newDueIso }) }); }
    catch (err) { console.error(err); setTodos(prev => prev.map(t => t.id === task.id ? task : t)); }
  };

  const getDayName = (offset: number) => {
    const dates = ['일', '월', '화', '수', '목', '금', '토'];
    const d = new Date(); d.setDate(d.getDate() + offset);
    if (offset === 0) return '오늘 (' + (d.getMonth() + 1) + '/' + d.getDate() + ')';
    return dates[d.getDay()] + ' (' + (d.getMonth() + 1) + '/' + d.getDate() + ')';
  };

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-[#fcfbf7]">
      <Script src="https://p.trellocdn.com/power-up.min.js" strategy="beforeInteractive" />
      <div className="p-5 border-b border-black/5 flex justify-between items-center bg-white/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-700 tracking-tight flex items-center gap-2"><CheckSquare size={20} className="text-blue-500" /> 통합 체크리스트</h2>
          <button className="text-xs bg-slate-200 hover:bg-slate-300 px-2 py-1 rounded text-slate-600 transition-colors" onClick={fetchTodos} disabled={loadingTodos}>{loadingTodos ? '...' : '새로고침'}</button>
        </div>
      </div>
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-5 bg-[#f6f5f0] relative min-w-0">
        <div className={`flex gap-4 h-full transition-opacity duration-300 ${loadingTodos ? 'opacity-40' : 'opacity-100'}`} style={{ width: 'max-content' }}>
          {overdueTodos.length > 0 && (
            <div className="flex flex-col h-full rounded-xl border bg-red-50/30 border-red-200 overflow-hidden w-[260px] shrink-0">
              <div className="py-2.5 px-3 text-center text-sm font-bold border-b bg-red-100/50 text-red-600 border-red-200 flex items-center justify-center gap-1"><Clock size={13} /> 기한 지남</div>
              <div className="flex-1 p-2 space-y-2 overflow-y-auto custom-scrollbar">
                {overdueTodos.map(task => (
                  <div key={task.id} className={`p-2.5 rounded-lg border shadow-sm transition-all ${task.state === 'complete' ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-red-200 hover:border-red-300'}`}>
                    <div className="flex items-start gap-2">
                      <input type="checkbox" checked={task.state === 'complete'} onChange={() => handleCheck(task.id, task.cardId, task.state)} className="mt-1 w-4 h-4 accent-red-500 rounded cursor-pointer" />
                      <div className="flex-1 min-w-0">
                        <button onClick={() => openCardInTrello(task.cardId)} className={`block text-left w-full text-[13px] font-bold leading-tight hover:text-red-600 transition-colors ${task.state === 'complete' ? 'line-through text-slate-400' : 'text-slate-700'}`}>{task.title}</button>
                        <div className="text-[11px] text-slate-500 mt-1 truncate" title={task.cardName}>{task.cardName}</div>
                        {task.due && <div className="text-[10px] text-red-500 mt-0.5 font-semibold">{new Date(task.due).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {Array.from({ length: 14 }, (_, i) => i).map(dayOffset => {
            const dayTasks = todos.filter(t => t.dayIndex === dayOffset);
            const isToday = dayOffset === 0;
            return (
              <div key={dayOffset} className={`flex flex-col h-full rounded-xl border w-[260px] shrink-0 ${isToday ? 'bg-sky-50/30 border-sky-200' : 'bg-white/40 border-slate-100'} overflow-hidden`} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, dayOffset)}>
                <div className={`py-2.5 px-3 text-center text-sm font-bold border-b ${isToday ? 'bg-sky-100/50 text-sky-700 border-sky-200' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>{getDayName(dayOffset)}</div>
                <div className="flex-1 p-2 space-y-2 overflow-y-auto custom-scrollbar">
                  {dayTasks.map(task => (
                    <div key={task.id} draggable onDragStart={(e) => handleDragStart(e, task)} className={`p-2.5 rounded-lg border shadow-sm transition-all cursor-move ${task.state === 'complete' ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200 hover:border-sky-300'}`}>
                      <div className="flex items-start gap-2">
                        <input type="checkbox" checked={task.state === 'complete'} onChange={() => handleCheck(task.id, task.cardId, task.state)} className="mt-1 w-4 h-4 accent-sky-500 rounded cursor-pointer" />
                        <div className="flex-1 min-w-0">
                          <button onClick={() => openCardInTrello(task.cardId)} className={`block text-left w-full text-[13px] font-bold leading-tight hover:text-sky-600 transition-colors ${task.state === 'complete' ? 'line-through text-slate-400' : 'text-slate-700'}`}>{task.title}</button>
                          <div className="text-[11px] text-slate-500 mt-1 truncate" title={task.cardName}>{task.cardName}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {dayTasks.length === 0 && <div className="text-center text-slate-400 text-xs py-4 flex items-center justify-center h-full opacity-50 border-2 border-dashed border-transparent hover:border-slate-300 rounded-lg">가져다 놓기</div>}
                </div>
              </div>
            );
          })}
        </div>
        {loadingTodos && <div className="absolute inset-0 flex justify-center items-center bg-white/10 backdrop-blur-[1px] z-10"><div className="flex flex-col items-center gap-2"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-500"></div><div className="text-xs font-bold text-sky-600 bg-white/80 px-2 py-0.5 rounded shadow-sm">업데이트 중...</div></div></div>}
      </div>
    </div>
  );
}
