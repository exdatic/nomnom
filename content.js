// Function to get filtered domains from search query
function getFilteredDomainsFromQuery() {
  const urlParams = new URLSearchParams(window.location.search);
  const query = urlParams.get('q') || '';
  const domains = new Set();
  
  // Extract all -site: domains from query
  const matches = query.match(/-site:(\S+)\s*/g) || [];
  matches.forEach(match => {
    const domain = match.replace('-site:', '').trim();
    domains.add(domain);
  });
  
  return domains;
}

// Function to modify search URL with domain filters
function modifySearchWithFilters(addDomain = null, removeDomain = null) {
  const urlParams = new URLSearchParams(window.location.search);
  const query = urlParams.get('q') || '';
  
  // Remove any existing -site: filters from the query
  let cleanQuery = query.replace(/-site:\S+\s*/g, '').trim();
  
  // Get current filtered domains and update as needed
  const domains = getFilteredDomainsFromQuery();
  if (addDomain) domains.add(addDomain);
  if (removeDomain) domains.delete(removeDomain);
  
  // Add -site: filter for each domain
  const filters = Array.from(domains)
    .map(domain => `-site:${domain}`)
    .join(' ');
  
  // Combine clean query with filters
  const newQuery = cleanQuery + (filters ? ' ' + filters : '');
  
  // Only update if the query would change
  if (newQuery !== query) {
    urlParams.set('q', newQuery);
    const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
    window.location.href = newUrl;
  }
}

// Create filter controls for a search result
function createFilterControls(result, domain) {
  const controls = document.createElement('div');
  controls.className = 'filter-controls';
  
  // Create checkbox
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'filter-checkbox';
  checkbox.checked = getFilteredDomainsFromQuery().has(domain);
  checkbox.title = 'Filter out this domain';
  
  checkbox.addEventListener('change', () => {
    if (checkbox.checked) {
      modifySearchWithFilters(domain);
    } else {
      modifySearchWithFilters(null, domain);
    }
  });
  
  controls.appendChild(checkbox);
  return controls;
}

// Create a single domain pill
function createDomainPill(domain) {
  const pill = document.createElement('div');
  pill.className = 'domain-pill';
  
  // Filter icon
  const filterIcon = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2.586a1 1 0 0 1-.293.707l-6.414 6.414v6.586a1 1 0 0 1-1.414.914l-2-1A1 1 0 0 1 11 19.414V13.414L4.293 7.293A1 1 0 0 1 4 6.586V4z"/>
    </svg>
  `;
  
  // Close icon
  const closeIcon = `
    <svg class="domain-pill-close" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M18 6L6 18M6 6l12 12"/>
    </svg>
  `;
  
  pill.innerHTML = `
    ${filterIcon}
    <span>${domain}</span>
    ${closeIcon}
  `;
  
  // Add click handler to close button
  const closeButton = pill.querySelector('.domain-pill-close');
  closeButton.addEventListener('click', (e) => {
    e.stopPropagation();
    modifySearchWithFilters(null, domain);
  });
  
  return pill;
}

// Create or update the filtered domains pills
function updateFilteredDomainsPills() {
  let container = document.querySelector('.filtered-domains-pills');
  if (!container) {
    container = document.createElement('div');
    container.className = 'filtered-domains-pills';
    
    // Insert into the main search results container
    const rcnt = document.querySelector('#rcnt');
    if (rcnt) {
      const center = rcnt.querySelector('#center_col');
      if (center) {
        center.insertBefore(container, center.firstChild);
      } else {
        rcnt.insertBefore(container, rcnt.firstChild);
      }
    } else {
      console.log('Debug - Could not find main container (#rcnt)');
    }
  }
  
  // Clear existing pills
  container.innerHTML = '';
  
  // Get and sort domains
  const domains = Array.from(getFilteredDomainsFromQuery()).sort();
  
  if (domains.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'filtered-domains-empty';
    emptyMessage.textContent = 'No filtered domains';
    container.appendChild(emptyMessage);
    return;
  }
  
  // Add pills for each domain
  domains.forEach(domain => {
    const pill = createDomainPill(domain);
    container.appendChild(pill);
  });
}

// Process search results
function updateResults() {
  const searchResults = document.querySelectorAll('div.g');
  
  searchResults.forEach(result => {
    const link = result.querySelector('a');
    if (!link) return;
    
    try {
      const domain = new URL(link.href).hostname;
      
      // Add filter controls if not already present
      if (!result.querySelector('.filter-controls')) {
        const controls = createFilterControls(result, domain);
        result.insertBefore(controls, result.firstChild);
      }
    } catch (e) {
      console.error('Error processing URL:', e);
    }
  });
  
  // Update pills
  updateFilteredDomainsPills();
}

// Create observer to handle dynamic loading of results
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.addedNodes.length) {
      updateResults();
    }
  });
});

// Function to initialize the extension
function initialize() {
  console.log('Debug - Initializing extension');
  
  // Try multiple times in case the page is still loading
  let attempts = 0;
  const maxAttempts = 5;
  
  function tryInitialize() {
    const searchResultsContainer = document.getElementById('search');
    console.log('Debug - Search container found:', !!searchResultsContainer);
    
    if (searchResultsContainer) {
      observer.observe(searchResultsContainer, {
        childList: true,
        subtree: true
      });
      
      // Initial update
      updateResults();
      updateFilteredDomainsPills();
    } else if (attempts < maxAttempts) {
      attempts++;
      setTimeout(tryInitialize, 500);
    }
  }
  
  tryInitialize();
}

// Start observing and handle dynamic page updates
initialize();

// Re-initialize on URL changes (for single-page navigation)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    initialize();
  }
}).observe(document, { subtree: true, childList: true });
