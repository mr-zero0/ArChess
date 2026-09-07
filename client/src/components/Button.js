import React from 'react';
import PropTypes from 'prop-types';
import './Button.css';

const Button = ({ children, onClick, disabled, variant = 'primary', type = 'button' }) => {
  return (
    <button
      className={`btn btn-${variant} ${disabled ? 'disabled' : ''}`}
      onClick={onClick}
      disabled={disabled}
      type={type}
    >
      {children}
    </button>
  );
};

Button.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'success', 'warning', 'info', 'link']),
  type: PropTypes.oneOf(['button', 'submit', 'reset'])
};

Button.defaultProps = {
  onClick: undefined,
  disabled: false,
  variant: 'primary',
  type: 'button'
};

export default Button;