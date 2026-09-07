import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './Menu.css';

const Menu = ({ title, children, onSubmit, onCancel, submitLabel = 'Submit', cancelLabel = 'Cancel' }) => {
  const [isOpen, setIsOpen] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Collect form data from children (in a real implementation, this would be more sophisticated)
    const formData = {}; // Would be populated from form fields
    onSubmit(formData);
    setIsOpen(false);
  };

  const handleCancel = () => {
    onCancel();
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="menu-backdrop" onClick={handleCancel}>
      <div className="menu-content" onClick={(e) => e.stopPropagation()}>
        <div className="menu-header">
          <h2>{title}</h2>
          <button className="menu-close" onClick={handleCancel}>
            ×
          </button>
        </div>
        <form className="menu-body" onSubmit={handleSubmit}>
          {children}
        </form>
        <div className="menu-footer">
          <button type="button" className="btn btn-secondary" onClick={handleCancel}>
            {cancelLabel}
          </button>
          <button type="submit" className="btn btn-primary">
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

Menu.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  submitLabel: PropTypes.string,
  cancelLabel: PropTypes.string
};

Menu.defaultProps = {
  submitLabel: 'Submit',
  cancelLabel: 'Cancel'
};

export default Menu;