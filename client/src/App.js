import React from 'react';

import { BrowserRouter as Router, Route, Switch } from 'react-router-dom'
import { Navigation, Footer, Home, Search, Login, Register, Help, About } from './components'

import './App.css';

function App(props) {
  return (
    <div className="App">
      <Router>
        <Navigation location={props.location}/>
        <Switch className="main-content">
          <Route path='/' exact component={() => <Home />} />
          <Route path='/search' exact component={() => <Search />} />
          <Route path='/login' exact component={() => <Login />} />
          <Route path='/register' exact component={() => <Register />} />
          <Route path='/help' exact component={() => <Help />} />
          <Route path='/about' exact component={() => <About />} />
        </Switch>
        <Footer />
      </Router>
    </div>
  );
}

export default App;
