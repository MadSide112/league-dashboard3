import React, { useEffect, useMemo, useState } from 'react';
import { Parameter, Participant } from '../types';
import { logger } from '../utils/logger';

interface AdminPanelProps {
  participants: Participant[];
  parameters: Parameter[];
  onUpdateParticipant: (id: string, updates: Partial<Participant>) => void;
  onAddParticipant: (participant: Omit<Participant, 'id'>) => void;
  onDeleteParticipant: (id: string) => void;
  onUpdateParameters: (parameters: Parameter[]) => void;
  onImportGoogleSheet: () => Promise<void>;
  isImportingSheet: boolean;
  onExportSnapshot: () => Promise<void>;
  isExporting: boolean;
  onSyncWithDatabase: () => Promise<void>;
  isSyncing: boolean;
  onViewLogs: () => void;
  onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({
  participants,
  parameters,
  onUpdateParticipant,
  onAddParticipant,
  onDeleteParticipant,
  onUpdateParameters,
  onImportGoogleSheet,
  isImportingSheet,
  onExportSnapshot,
  isExporting,
  onSyncWithDatabase,
  isSyncing,
  onViewLogs,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'participants' | 'parameters'>('participants');
  const [selectedParticipantId, setSelectedParticipantId] = useState('');
  const [parameterValues, setParameterValues] = useState<Record<string, number>>({});
  const [revenueInput, setRevenueInput] = useState('0');
  const [newParticipantName, setNewParticipantName] = useState('');
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newParamName, setNewParamName] = useState('');
  const [newParamWeight, setNewParamWeight] = useState(1);

  useEffect(() => {
    if (!selectedParticipantId && participants.length > 0) {
      setSelectedParticipantId(participants[0].id);
    }
  }, [participants, selectedParticipantId]);

  const selectedParticipant = useMemo(
    () => participants.find((p) => p.id === selectedParticipantId),
    [participants, selectedParticipantId]
  );

  useEffect(() => {
    if (!selectedParticipant) {
      return;
    }

    const initialValues: Record<string, number> = {};
    parameters.forEach((param) => {
      initialValues[param.id] = selectedParticipant.parameters[param.name] || 0;
    });
    setParameterValues(initialValues);
    setRevenueInput(String(selectedParticipant.revenue));
  }, [selectedParticipant, parameters]);

  const saveScores = () => {
    if (!selectedParticipant) {
      return;
    }

    const normalizedParameters: Record<string, number> = {};
    let paramsScore = 0;
    parameters.forEach((param) => {
      const value = parameterValues[param.id] || 0;
      normalizedParameters[param.name] = value;
      paramsScore += value * param.weight;
    });

    const revenue = Math.max(0, Number(revenueInput) || 0);
    const revenueScore = Math.floor(revenue / 50000) * 5;
    const totalScore = paramsScore + revenueScore;

    onUpdateParticipant(selectedParticipant.id, {
      parameters: normalizedParameters,
      revenue,
      revenueScore,
      totalScore,
    });

    logger.addLog('Обновление участника', `${selectedParticipant.fullName}: итог ${totalScore}`);
  };

  const addParticipant = () => {
    const fullName = newParticipantName.trim();
    if (!fullName) {
      return;
    }

    const parameterMap: Record<string, number> = {};
    parameters.forEach((param) => {
      parameterMap[param.name] = 0;
    });

    onAddParticipant({
      fullName,
      totalScore: 0,
      parameters: parameterMap,
      revenue: 0,
      revenueScore: 0,
    });
    logger.addLog('Добавление участника', fullName);
    setNewParticipantName('');
  };

  const removeParticipant = (participant: Participant) => {
    if (!window.confirm(`Удалить участника ${participant.fullName}?`)) {
      return;
    }
    onDeleteParticipant(participant.id);
    logger.addLog('Удаление участника', participant.fullName);
  };

  const saveEditedName = () => {
    if (!editingParticipantId) {
      return;
    }
    const nextName = editingName.trim();
    if (!nextName) {
      return;
    }

    onUpdateParticipant(editingParticipantId, { fullName: nextName });
    logger.addLog('Редактирование ФИО', nextName);
    setEditingParticipantId(null);
    setEditingName('');
  };

  const addParameter = () => {
    const paramName = newParamName.trim();
    if (!paramName) {
      return;
    }

    const nextParam: Parameter = {
      id: `param-${Date.now()}`,
      name: paramName,
      weight: newParamWeight,
    };

    onUpdateParameters([...parameters, nextParam]);
    logger.addLog('Добавление параметра', `${paramName} (${newParamWeight})`);
    setNewParamName('');
    setNewParamWeight(1);
  };

  const removeParameter = (param: Parameter) => {
    if (!window.confirm(`Удалить параметр "${param.name}"?`)) {
      return;
    }
    onUpdateParameters(parameters.filter((item) => item.id !== param.id));
    logger.addLog('Удаление параметра', param.name);
  };

  return (
    <section className="border border-zinc-800 bg-zinc-900/70">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-5 py-4 md:px-6">
        <h3 className="font-serif text-2xl uppercase tracking-[0.08em] text-zinc-100">Администрирование</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onSyncWithDatabase}
            disabled={isSyncing}
            className="border border-blue-700/70 bg-zinc-950 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-blue-200 transition-colors hover:bg-zinc-900 disabled:opacity-50"
          >
            {isSyncing ? 'Синхронизация...' : '📥 Плюсовать данные'}
          </button>
          <button
            onClick={onImportGoogleSheet}
            disabled={isImportingSheet}
            className="border border-amber-700/70 bg-zinc-950 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-amber-200 transition-colors hover:bg-zinc-900 disabled:opacity-50"
          >
            {isImportingSheet ? 'Импорт...' : 'Синхронизация'}
          </button>
          <button
            onClick={onExportSnapshot}
            disabled={isExporting}
            className="border border-emerald-700/70 bg-zinc-950 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-emerald-200 transition-colors hover:bg-zinc-900 disabled:opacity-50"
          >
            {isExporting ? 'Выгрузка...' : 'Выгрузка месяца'}
          </button>
          <button
            onClick={onViewLogs}
            className="border border-zinc-700 bg-zinc-950 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-zinc-200 transition-colors hover:bg-zinc-900"
          >
            Логи
          </button>
          <button
            onClick={onClose}
            className="border border-zinc-700 bg-zinc-950 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-zinc-300 transition-colors hover:bg-zinc-900"
          >
            Закрыть
          </button>
        </div>
      </div>

      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('participants')}
          className={`px-5 py-3 text-sm uppercase tracking-[0.14em] ${
            activeTab === 'participants' ? 'bg-zinc-950 text-amber-200' : 'text-zinc-400'
          }`}
        >
          Участники
        </button>
        <button
          onClick={() => setActiveTab('parameters')}
          className={`px-5 py-3 text-sm uppercase tracking-[0.14em] ${
            activeTab === 'parameters' ? 'bg-zinc-950 text-amber-200' : 'text-zinc-400'
          }`}
        >
          Параметры
        </button>
      </div>

      {activeTab === 'participants' && (
        <div className="grid gap-0 lg:grid-cols-[320px_1fr]">
          <aside className="border-r border-zinc-800 bg-zinc-950/60 p-5">
            <p className="mb-2 text-xs uppercase tracking-[0.16em] text-zinc-500">Новый участник</p>
            <div className="flex gap-2">
              <input
                value={newParticipantName}
                onChange={(e) => setNewParticipantName(e.target.value)}
                className="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500"
                placeholder="ФИО"
              />
              <button
                onClick={addParticipant}
                className="border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
              >
                +
              </button>
            </div>

            <div className="mt-5 space-y-2">
              {participants.map((participant) => {
                const selected = participant.id === selectedParticipantId;
                return (
                  <div
                    key={participant.id}
                    className={`cursor-pointer border px-3 py-3 ${
                      selected ? 'border-amber-600 bg-zinc-900' : 'border-zinc-800 bg-zinc-950/70'
                    }`}
                    onClick={() => setSelectedParticipantId(participant.id)}
                  >
                    <p className="truncate text-sm font-medium text-zinc-100">{participant.fullName}</p>
                    <p className="mt-1 text-xs text-zinc-400">{participant.totalScore} баллов</p>
                    <div className="mt-2 flex gap-2 text-xs">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingParticipantId(participant.id);
                          setEditingName(participant.fullName);
                        }}
                        className="border border-zinc-700 px-2 py-1 text-zinc-300"
                      >
                        ФИО
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeParticipant(participant);
                        }}
                        className="border border-zinc-700 px-2 py-1 text-zinc-300"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          <div className="p-5 md:p-6">
            {!selectedParticipant && <p className="text-zinc-500">Выберите участника.</p>}
            {selectedParticipant && (
              <div className="space-y-6">
                {editingParticipantId === selectedParticipant.id && (
                  <div className="border border-zinc-800 bg-zinc-950/80 p-4">
                    <p className="mb-2 text-xs uppercase tracking-[0.16em] text-zinc-500">Редактирование ФИО</p>
                    <div className="flex gap-2">
                      <input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500"
                      />
                      <button onClick={saveEditedName} className="border border-zinc-700 px-3 py-2 text-xs text-zinc-200">
                        Сохранить
                      </button>
                      <button
                        onClick={() => setEditingParticipantId(null)}
                        className="border border-zinc-700 px-3 py-2 text-xs text-zinc-400"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="border border-zinc-800 bg-zinc-950/70 p-4">
                    <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">Итог</p>
                    <p className="mt-2 text-3xl font-semibold text-zinc-100">{selectedParticipant.totalScore}</p>
                  </div>
                  <div className="border border-zinc-800 bg-zinc-950/70 p-4">
                    <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">Валовка</p>
                    <p className="mt-2 text-3xl font-semibold text-zinc-100">
                      {selectedParticipant.revenue.toLocaleString('ru-RU')} ₽
                    </p>
                  </div>
                  <div className="border border-zinc-800 bg-zinc-950/70 p-4">
                    <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">За выручку</p>
                    <p className="mt-2 text-3xl font-semibold text-amber-300">{selectedParticipant.revenueScore}</p>
                  </div>
                </div>

                <div className="border border-zinc-800 bg-zinc-950/70 p-4">
                  <p className="mb-3 text-xs uppercase tracking-[0.15em] text-zinc-500">Параметры</p>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {parameters.map((param) => (
                      <label key={param.id} className="border border-zinc-800 bg-zinc-900/60 p-3">
                        <p className="text-sm text-zinc-200">{param.name}</p>
                        <p className="mt-1 text-xs text-zinc-500">вес: {param.weight}</p>
                        <input
                          type="number"
                          value={parameterValues[param.id] || 0}
                          onChange={(e) =>
                            setParameterValues((prev) => ({
                              ...prev,
                              [param.id]: Number(e.target.value) || 0,
                            }))
                          }
                          className="mt-2 w-full border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <div className="border border-zinc-800 bg-zinc-950/70 p-4">
                  <p className="mb-2 text-xs uppercase tracking-[0.15em] text-zinc-500">Валовка</p>
                  <input
                    type="number"
                    min={0}
                    value={revenueInput}
                    onChange={(e) => setRevenueInput(e.target.value)}
                    className="w-full max-w-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  onClick={saveScores}
                  className="bg-gradient-to-r from-amber-700 to-orange-700 px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-zinc-950"
                >
                  Сохранить изменения
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'parameters' && (
        <div className="p-5 md:p-6">
          <div className="border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="mb-2 text-xs uppercase tracking-[0.16em] text-zinc-500">Добавить параметр</p>
            <div className="flex flex-col gap-2 md:flex-row">
              <input
                value={newParamName}
                onChange={(e) => setNewParamName(e.target.value)}
                className="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500"
                placeholder="Название"
              />
              <input
                type="number"
                value={newParamWeight}
                onChange={(e) => setNewParamWeight(Number(e.target.value) || 0)}
                className="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500 md:w-36"
                placeholder="Вес"
              />
              <button onClick={addParameter} className="border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-200">
                Добавить
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {parameters.map((param) => (
              <div key={param.id} className="flex items-center justify-between border border-zinc-800 bg-zinc-950/70 px-4 py-3">
                <div>
                  <p className="text-sm text-zinc-100">{param.name}</p>
                  <p className="text-xs text-zinc-500">Вес: {param.weight}</p>
                </div>
                <button onClick={() => removeParameter(param)} className="border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
                  Удалить
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default AdminPanel;