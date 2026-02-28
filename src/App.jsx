import React from 'react'
import { OrgProvider } from './context/OrgContext'
import Sidebar from './components/Sidebar'
import EndpointEditor from './components/EndpointEditor'
import Spreadsheet from './components/Spreadsheet'

export default function App() {
  return (
    <OrgProvider>
      <div className="flex h-screen bg-slate-900 text-cyan-100 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <EndpointEditor />
          <Spreadsheet />
        </div>
      </div>
    </OrgProvider>
  )
}
