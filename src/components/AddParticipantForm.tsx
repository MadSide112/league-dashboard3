import React, { useState } from 'react';
import { Participant } from '../types';

interface AddParticipantFormProps {
  onAdd: (participant: Omit<Participant, 'id'>) => void;
  onCancel: () => void;
}

const AddParticipantForm: React.FC<AddParticipantFormProps> = ({ onAdd, onCancel }) => {
  const [fullName, setFullName] = useState('');
  const [parameters, setParameters] = useState<Record<string, number>>({
    'Качество работы': 0,
    'Скорость выполнения': 0,
    'Клиентские отзывы': 0,
  });
  const [revenue, setRevenue] = useState(0);
  const [newParamName, setNewParamName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      alert('Введите ФИО участника');
      return;
    }

    const revenueScore = Math.floor(revenue / 50000) * 5;
    const paramsSum = Object.values(parameters).reduce((sum, val) => sum + val, 0);
    const totalScore = paramsSum + revenueScore;

    onAdd({
      fullName: fullName.trim(),
      totalScore,
      parameters: { ...parameters },
      revenue,
      revenueScore,
    });

    // Сброс формы
    setFullName('');
    setParameters({
      'Качество работы': 0,
      'Скорость выполнения': 0,
      'Клиентские отзывы': 0,
    });
    setRevenue(0);
  };

  const addParameter = () => {
    if (newParamName.trim() && !parameters.hasOwnProperty(newParamName.trim())) {
      setParameters(prev => ({
        ...prev,
        [newParamName.trim()]: 0
      }));
      setNewParamName('');
    }
  };

  const removeParameter = (paramName: string) => {
    const newParams = { ...parameters };
    delete newParams[paramName];
    setParameters(newParams);
  };

  const updateParameterValue = (paramName: string, value: number) => {
    setParameters(prev => ({
      ...prev,
      [paramName]: Math.max(0, value)
    }));
  };

  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Добавить нового участника</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ФИО участника *
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Иванов Иван Иванович"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Выручка (в рублях)
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={revenue}
              onChange={(e) => setRevenue(Number(e.target.value))}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              step="1000"
            />
            <div className="text-sm text-gray-600 whitespace-nowrap">
              = {Math.floor(revenue / 50000) * 5} баллов (5 за каждые 50 000 ₽)
            </div>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Параметры оценки
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newParamName}
                onChange={(e) => setNewParamName(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Новый параметр"
              />
              <button
                type="button"
                onClick={addParameter}
                className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg"
              >
                Добавить
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(parameters).map(([paramName, value]) => (
              <div key={paramName} className="flex items-center space-x-2 p-2 bg-white rounded-lg border">
                <span className="flex-1 text-sm font-medium">{paramName}</span>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => updateParameterValue(paramName, Number(e.target.value))}
                  className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  min="0"
                  max="100"
                />
                <button
                  type="button"
                  onClick={() => removeParameter(paramName)}
                  className="px-2 py-1 text-red-600 hover:text-red-800"
                  title="Удалить параметр"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Отмена
          </button>
          <button
            type="submit"
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium"
          >
            Добавить участника
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddParticipantForm;