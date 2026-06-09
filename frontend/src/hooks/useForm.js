// frontend/src/hooks/useForm.js
import { useState, useCallback, useRef } from 'react';

/**
 * Hook genérico adaptativo para la gestión de estados de formularios.
 * Estabiliza las referencias del valor inicial para prevenir bucles de renderizado
 * y normaliza de forma nativa la captura de inputs complejos (textos, números y checkboxes).
 */
const useForm = (initialValues = {}) => {
  const [values, setValues] = useState(initialValues);

  // Almacenamos el valor inicial de la primera carga en una referencia.
  // Esto previene mutaciones y re-renderizados si 'initialValues' se pasa como un literal de objeto.
  const initialValuesRef = useRef(initialValues);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    
    setValues((prev) => ({
      ...prev,
      // Discriminación precisa de tipos: maneja booleanos nativos de inputs checkbox
      [name]: type === 'checkbox' ? checked : value,
    }));
  }, []);

  const resetForm = useCallback(() => {
    // Restablecemos usando la referencia estática inmune a mutaciones del componente padre
    setValues(initialValuesRef.current);
  }, []);

  const setFormValuesExplicitly = useCallback((newValues) => {
    setValues((prev) => ({
      ...prev,
      ...(typeof newValues === 'function' ? newValues(prev) : newValues),
    }));
  }, []);

  return [values, handleChange, resetForm, setFormValuesExplicitly];
};

export default useForm;