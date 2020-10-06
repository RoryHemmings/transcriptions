import React, { Component } from "react";
import { Link } from "react-router-dom";

export default class Login extends Component {
	constructor(props) {
		super();
		this.state = {
			username: "",
			password: "",
			error: false,
		};

		this.onSubmit = this.onSubmit.bind(this);
	}

	async onSubmit(event) {
		event.preventDefault();

		const data = {
			username: this.state.username,
			password: this.state.password,
		};

		const r = await fetch("/login", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		});

		// Because apparently .json() is async.
		/* Developers who wrote the fetch function - "Yeah lets just make a function that doesn't 
		 need to by async, async just because it usually goes with other async requests or something. It definately won't make 
		 some kid get stuck for 45 minutes trying to figure out why calling .json() on an response object 
		 for some reason causes await to fail" */
		const res = await r.json();

		if (res.successful) window.location.href = "/";
		else this.setState({ error: res.message });
	}

	render() {
		return (
			<div className="container login col-md-2">
				<form onSubmit={this.onSubmit}>
					<h1>Log in</h1>

					<div className="form-group">
						<label htmlFor="username">Username</label>
						<input
							name="username"
							className="form-control"
							type="text"
							placeholder="Username"
							required
							value={this.state.username}
							onChange={(e) => this.setState({ username: e.target.value })}
						></input>
					</div>

					<div className="form-group">
						<label htmlFor="password">Password</label>
						<input
							name="password"
							className="form-control"
							type="password"
							placeholder="Password"
							required
							value={this.state.password}
							onChange={(e) => this.setState({ password: e.target.value })}
						></input>
					</div>

					<p className="text-danger">{this.state.error}</p>

					<button type="submit" className="btn btn-primary">
						Log in
					</button>
				</form>
				<p className="text-muted">
					or <Link to="/register">Register Instead</Link>
				</p>
			</div>
		);
	}
}
