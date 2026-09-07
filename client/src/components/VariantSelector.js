import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './VariantSelector.css';

const VariantSelector = ({ variants, selectedVariant, onSelect, includeCustom = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredVariants, setFilteredVariants] = useState([]);

  useEffect(() => {
    if (!variants) return;
    const filtered = variants.filter(variant =>
      variant.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredVariants(filtered);
  }, [variants, searchTerm]);

  const handleSelect = (variantId) => {
    onSelect(variantId);
    setIsOpen(false);
  };

  return (
    <div className="variant-selector">
      <div className="variant-selector-trigger" onClick={() => setIsOpen(!isOpen)}>
        <div className="selected-variant">
          {selectedVariant ? (
            <span className="variant-name">
              {variants.find(v => v.id === selectedVariant)?.name || 'Select Variant'}
            </span>
          ) : (
            <span className="variant-name">Select Variant</span>
          )}
          <span className="dropdown-arrow">▼</span>
        </div>
      </div>

      {isOpen && (
        <div className="variant-selector-dropdown">
          <div className="variant-search">
            <input
              type="text"
              placeholder="Search variants..."
              className="variant-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="variant-list">
            {filteredVariants.length > 0 ? (
              filteredVariants.map(variant => (
                <div
                  key={variant.id}
                  className={`variant-item ${variant.id === selectedVariant ? 'selected' : ''}`}
                  onClick={() => handleSelect(variant.id)}
                >
                  <div className="variant-info">
                    <div className="variant-name">{variant.name}</div>
                    {variant.description && (
                      <div className="variant-description">{variant.description}</div>
                    )}
                  </div>
                  {variant.isCustom && (
                    <span className="variant-badge variant-custom">Custom</span>
                  )}
                  {variant.isDefault && (
                    <span className="variant-badge variant-default">Default</span>
                  )}
                </div>
              ))
            ) : (
              <div className="variant-empty">No variants found</div>
            )}
          </div>

          {includeCustom && (
            <div className="variant-footer">
              <Button
                variant="secondary"
                onClick={() => {
                  // Navigate to variant editor or show modal
                  alert('Variant editor would open here');
                }}
              >
                Create Custom Variant
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

VariantSelector.propTypes = {
  variants: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    isCustom: PropTypes.bool,
    isDefault: PropTypes.bool
  })),
  selectedVariant: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
  includeCustom: PropTypes.bool
};

VariantSelector.defaultProps = {
  variants: [],
  selectedVariant: null,
  includeCustom: false
};

export default VariantSelector;