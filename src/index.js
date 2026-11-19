// Customer lookup application
class CustomerLookup {
  constructor() {
    this.data = [];
    this.filteredData = [];
    this.currentSort = { column: 'CustomerNumber', direction: 'asc' };
    
    this.init();
  }

  init() {
    try {
      this.setupEventListeners();
      this.showWaitingForData();
    } catch (error) {
      console.error('Failed to initialize application:', error);
      this.showError('Failed to initialize application');
    }
  }

  loadCustomerData(jsonData) {
    try {
      // Handle both direct array and OData response format
      this.data = Array.isArray(jsonData) ? jsonData : (jsonData.value || []);
      this.filteredData = [...this.data];
      
      // Sort initially by CustomerNumber
      this.sortData('CustomerNumber', 'asc');
      
      console.log(`Loaded ${this.data.length} customer records`);
      
      this.renderTable();
    } catch (error) {
      console.error('Error processing customer data:', error);
      this.showError('Failed to process customer data');
    }
  }

  setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
      this.handleSearch(e.target.value);
    });

    // Clear button
    const clearButton = document.getElementById('clearButton');
    clearButton.addEventListener('click', () => {
      searchInput.value = '';
      this.handleSearch('');
      searchInput.focus();
    });

    // Sort headers
    const sortHeaders = document.querySelectorAll('.sortable');
    sortHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const column = header.getAttribute('data-column');
        this.handleSort(column);
      });
    });

    // Enter key in search
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
      }
    });
  }

  setSearchText(searchText) {
    const searchInput = document.getElementById('searchInput');
    const value = searchText == null ? '' : String(searchText);

    searchInput.value = value;
    this.handleSearch(value);
    searchInput.focus();
  }

  handleSearch(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    
    if (!term) {
      this.filteredData = [...this.data];
    } else {
      this.filteredData = this.data.filter(item => {
        const customerNumber = (item.CustomerNumber || '').toString().toLowerCase();
        const customer = (item.Customer || '').toLowerCase();
        const name = (item.Name || '').toLowerCase();
        const address = (item.AddrServ_1Line || '').toLowerCase();
        
        return (
          customerNumber.includes(term) ||
          customer.includes(term) ||
          name.includes(term) ||
          address.includes(term)
        );
      });
    }
    
    // Re-sort the filtered data
    this.sortData(this.currentSort.column, this.currentSort.direction);
    this.renderTable();
  }

  handleSort(column) {
    let direction = 'asc';
    
    // Toggle direction if clicking the same column
    if (this.currentSort.column === column && this.currentSort.direction === 'asc') {
      direction = 'desc';
    }
    
    this.currentSort = { column, direction };
    this.sortData(column, direction);
    this.updateSortUI();
    this.renderTable();
  }

  sortData(column, direction) {
    this.filteredData.sort((a, b) => {
      let valueA = a[column] || '';
      let valueB = b[column] || '';
      
      // Handle CustomerNumber as numeric
      if (column === 'CustomerNumber') {
        valueA = this.parseCustomerNumber(valueA);
        valueB = this.parseCustomerNumber(valueB);
        
        if (direction === 'asc') {
          return valueA - valueB;
        } else {
          return valueB - valueA;
        }
      }
      
      // Handle text columns
      valueA = valueA.toString().toLowerCase();
      valueB = valueB.toString().toLowerCase();
      
      if (direction === 'asc') {
        return valueA.localeCompare(valueB);
      } else {
        return valueB.localeCompare(valueA);
      }
    });
  }

  parseCustomerNumber(value) {
    // Extract numeric part from customer number for proper sorting
    const numericPart = value.toString().match(/\d+/);
    return numericPart ? parseInt(numericPart[0]) : 0;
  }

  updateSortUI() {
    // Clear all sort indicators
    document.querySelectorAll('.sortable').forEach(header => {
      header.classList.remove('sorted-asc', 'sorted-desc');
    });
    
    // Add sort indicator to current column
    const currentHeader = document.querySelector(`[data-column="${this.currentSort.column}"]`);
    if (currentHeader) {
      currentHeader.classList.add(`sorted-${this.currentSort.direction}`);
    }
  }

  renderTable() {
    const tbody = document.getElementById('customerTableBody');
    const loadingIndicator = document.getElementById('loadingIndicator');
    
    // Hide loading indicator
    loadingIndicator.style.display = 'none';
    
    if (this.filteredData.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="empty-state">
            <h3>No customers found</h3>
            <p>Try adjusting your search criteria</p>
          </td>
        </tr>
      `;
      return;
    }
    
    tbody.innerHTML = this.filteredData.map((item, index) => `
      <tr class="clickable-row" data-row-index="${index}">
        <td>${this.escapeHtml(item.CustomerNumber || '')}</td>
        <td>${this.escapeHtml(item.Customer || '')}</td>
        <td>${this.escapeHtml(item.Name || '')}</td>
        <td>${this.escapeHtml(item.AddrServ_1Line || '')}</td>
      </tr>
    `).join('');
    
    // Add click event listeners to all data rows
    this.setupRowClickListeners();
  }

  setupRowClickListeners() {
    const rows = document.querySelectorAll('.clickable-row');
    rows.forEach(row => {
      row.addEventListener('click', () => {
        const rowIndex = parseInt(row.getAttribute('data-row-index'));
        const rowData = this.filteredData[rowIndex];
        this.handleRowClick(rowData);
      });
    });
  }

  handleRowClick(rowData) {
    try {
      // Prepare the parameter object with row data and mode
      const parameter = {
        ...rowData,
        mode: 'customerSelect'
      };
      
      console.log('Calling FileMaker script with parameter:', parameter);
      
      // Call the FileMaker script
      this.callFileMakerScript('Manage: Ticket - Landfill', parameter);
      
    } catch (error) {
      console.error('Error handling row click:', error);
    }
  }

  callFileMakerScript(scriptName, parameter) {
    try {
      // Check if FileMaker object is available
      if (typeof FileMaker !== 'undefined' && FileMaker.PerformScript) {
        // FileMaker Pro Advanced method
        FileMaker.PerformScript(scriptName, JSON.stringify(parameter));
      } else if (typeof window.FileMaker !== 'undefined' && window.FileMaker.PerformScript) {
        // Alternative FileMaker object location
        window.FileMaker.PerformScript(scriptName, JSON.stringify(parameter));
      } else if (typeof fmp !== 'undefined' && fmp.PerformScript) {
        // Legacy FileMaker method
        fmp.PerformScript(scriptName, JSON.stringify(parameter));
      } else {
        // For testing outside FileMaker
        console.warn('FileMaker not detected. Script call would be:', {
          script: scriptName,
          parameter: parameter
        });
        
        // Try alternative method using location change (fallback)
        const encodedParameter = encodeURIComponent(JSON.stringify(parameter));
        window.location.href = `fmp://${scriptName}?param=${encodedParameter}`;
      }
    } catch (error) {
      console.error('Error calling FileMaker script:', error);
    }
  }

  showWaitingForData() {
    const tbody = document.getElementById('customerTableBody');
    const loadingIndicator = document.getElementById('loadingIndicator');
    
    loadingIndicator.style.display = 'none';
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-state">
          <h3>Waiting for data</h3>
          <p>Ready to receive customer data from FileMaker</p>
        </td>
      </tr>
    `;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showError(message) {
    const tbody = document.getElementById('customerTableBody');
    const loadingIndicator = document.getElementById('loadingIndicator');
    
    loadingIndicator.style.display = 'none';
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-state">
          <h3>Error</h3>
          <p>${this.escapeHtml(message)}</p>
        </td>
      </tr>
    `;
  }
}

// Initialize the application when the DOM is loaded
let customerLookupApp;

document.addEventListener('DOMContentLoaded', () => {
  customerLookupApp = new CustomerLookup();
});

// Also initialize if DOMContentLoaded has already fired
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    customerLookupApp = new CustomerLookup();
  });
} else {
  customerLookupApp = new CustomerLookup();
}

// Global function for FileMaker to call with customer data
window.loadCustomerData = function(jsonData) {
  try {
    console.log('Received customer data from FileMaker');
    
    // Parse JSON string if needed
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    
    if (customerLookupApp) {
      customerLookupApp.loadCustomerData(data);
    } else {
      // If app isn't ready yet, wait for it
      setTimeout(() => {
        if (customerLookupApp) {
          customerLookupApp.loadCustomerData(data);
        } else {
          console.error('Customer lookup app not initialized');
        }
      }, 100);
    }
  } catch (error) {
    console.error('Error loading customer data:', error);
    if (customerLookupApp) {
      customerLookupApp.showError('Invalid data format received from FileMaker');
    }
  }
};

// Global function for FileMaker to call with text to enter into the search input
window.setSearchText = function(searchText) {
  try {
    console.log('Received search text from FileMaker:', searchText);

    if (customerLookupApp) {
      customerLookupApp.setSearchText(searchText);
    } else {
      // If app isn't ready yet, wait for it
      setTimeout(() => {
        if (customerLookupApp) {
          customerLookupApp.setSearchText(searchText);
        } else {
          console.error('Customer lookup app not initialized');
        }
      }, 100);
    }
  } catch (error) {
    console.error('Error setting search text:', error);
  }
};