import React, { Component } from "react";
import { Link, withRouter } from "react-router-dom";

class NavbarItem extends Component {
	render() {
		return (
			<li
				className={`nav-item  ${
					this.props.location.pathname === this.props.dest ? "active" : ""
				}`}
			>
				<Link className="navbar-secondary" to={this.props.dest}>
					{this.props.children}
				</Link>
			</li>
		);
	}
}

class Navigation extends Component {
	render() {
		return (
			<nav className="navbar navbar-expand-lg navbar-dark bg-dark">
				<Link className="navbar-brand" to="/">
					Transcriptions
				</Link>
				<button
					className="navbar-toggler"
					type="button"
					data-toggle="collapse"
					data-target="#navbarSupportedContent"
					aria-controls="navbarSupportedContent"
					aria-expanded="false"
					aria-label="Toggle navigation"
				>
					<span className="navbar-toggler-icon"></span>
				</button>

				<div className="collapse navbar-collapse">
					<ul className="navbar-nav mr-auto">
						<NavbarItem location={this.props.location} dest="/search">
							Search
						</NavbarItem>

						<NavbarItem location={this.props.location} dest="/login">
							Login
						</NavbarItem>

						<NavbarItem location={this.props.location} dest="/help">
							Help
						</NavbarItem>

						<NavbarItem location={this.props.location} dest="/about">
							About
						</NavbarItem>
					</ul>
				</div>
			</nav>
		);
	}
}

export default withRouter(Navigation);
